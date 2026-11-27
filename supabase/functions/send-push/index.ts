// Planazo · send-push
//
// Called by the database (private.send_push via pg_net) with
//   { user_id, title, body, data }
// and the header `x-push-secret`, checked against the Vault secret `push_webhook_secret`.
// Sends the message to every device of that user through the Expo Push API and forgets
// tokens Expo reports as DeviceNotRegistered.
//
// Optional secret EXPO_ACCESS_TOKEN: needed only if "Enhanced push security" is on in Expo.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = { user_id: string; title: string; body?: string; data?: Record<string, unknown> };
type Ticket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo's limit per request

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const secret = req.headers.get('x-push-secret');
  if (!secret) return json(401, { error: 'unauthorized' });
  const { data: valid, error: checkError } = await admin.rpc('check_push_secret', { secret });
  if (checkError) return json(500, { error: checkError.message });
  if (!valid) return json(401, { error: 'unauthorized' });

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  if (!payload.user_id || !payload.title) return json(400, { error: 'missing_fields' });

  const { data: rows, error } = await admin.from('push_tokens').select('token').eq('user_id', payload.user_id);
  if (error) return json(500, { error: error.message });
  const tokens = (rows ?? []).map((r) => r.token as string);
  if (tokens.length === 0) return json(200, { sent: 0 });

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const stale: string[] = [];
  let sent = 0;

  for (let i = 0; i < tokens.length; i += BATCH) {
    const chunk = tokens.slice(i, i + BATCH);
    const messages = chunk.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));

    const res = await fetch(EXPO_SEND, { method: 'POST', headers, body: JSON.stringify(messages) });
    const result = await res.json().catch(() => null);
    if (!res.ok || !result?.data) {
      console.error('[send-push] Expo error', res.status, JSON.stringify(result));
      continue;
    }

    (result.data as Ticket[]).forEach((ticket, index) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') stale.push(chunk[index]);
      else console.error('[send-push] ticket error', ticket.message, ticket.details?.error);
    });
  }

  if (stale.length > 0) await admin.from('push_tokens').delete().in('token', stale);

  return json(200, { sent, removed: stale.length });
});
