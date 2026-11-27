-- Planazo · Push notifications (Expo Push Service via a Supabase Edge Function).
--
-- push_tokens   → one row per device (Expo push token), owned by whoever signed in last on it.
-- Triggers on invitations/connections build the message and POST it with pg_net to the
-- `send-push` Edge Function, which looks up the tokens and calls the Expo Push API.
--
-- Setup (once per project, NOT in this file because the values are per environment):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
-- The shared secret between the database and the function is generated below.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Tokens
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
comment on table public.push_tokens is 'Expo push tokens per device. Written only through register/unregister RPCs.';
create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens: read own" on public.push_tokens
for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete on public.push_tokens from authenticated, anon;

-- A device that changes account moves its token to the new user, so RLS alone can't do the upsert.
create or replace function public.register_push_token(token text, platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (register_push_token.token, (select auth.uid()), register_push_token.platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens t
  where t.token = unregister_push_token.token and t.user_id = (select auth.uid());
$$;

revoke execute on function public.register_push_token(text, text), public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text), public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Shared secret: the function checks it through check_push_secret() (service role only).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret');
  end if;
end;
$$;

create or replace function public.check_push_secret(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'push_webhook_secret' and s.decrypted_secret = check_push_secret.secret
  );
$$;

revoke execute on function public.check_push_secret(text) from public, anon, authenticated;
grant execute on function public.check_push_secret(text) to service_role;

-- ---------------------------------------------------------------------------
-- Sending
-- ---------------------------------------------------------------------------

-- Fire-and-forget POST to the Edge Function. Never blocks or fails the user's write.
create or replace function private.send_push(recipient uuid, title text, body text, data jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  secret text;
begin
  if recipient is null or recipient = (select auth.uid()) then
    return;
  end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = recipient) then
    return;
  end if;

  select decrypted_secret into base from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if base is null or secret is null then
    raise warning 'send_push: missing vault secret project_url or push_webhook_secret';
    return;
  end if;

  perform net.http_post(
    url := base || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('user_id', recipient, 'title', title, 'body', body, 'data', data),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'send_push failed: %', sqlerrm;
end;
$$;

-- "X te propone un plan" → recipient. Answer → sender.
create or replace function private.notify_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_title text;
  actor text;
begin
  select p.title into plan_title from public.plans p where p.id = new.plan_id;

  if tg_op = 'INSERT' then
    select pr.name into actor from public.profiles pr where pr.id = new.from_id;
    perform private.send_push(
      new.to_id,
      actor || ' te propone un plan',
      coalesce(nullif(trim(new.note), ''), plan_title),
      jsonb_build_object('url', '/propuestas', 'type', 'invitation', 'plan_id', new.plan_id)
    );
  elsif new.response is distinct from old.response and new.response <> 'pendiente' then
    select pr.name into actor from public.profiles pr where pr.id = new.to_id;
    perform private.send_push(
      new.from_id,
      case new.response
        when 'si' then actor || ' se apunta 🎉'
        when 'quizas' then actor || ' dice que quizás'
        else actor || ' no puede esta vez'
      end,
      plan_title,
      jsonb_build_object('url', '/plan/' || new.plan_id, 'type', 'invitation_response', 'plan_id', new.plan_id)
    );
  end if;
  return null;
end;
$$;

create trigger invitations_notify after insert or update of response on public.invitations
for each row execute function private.notify_invitation();

-- Someone redeemed my invite code: of the two rows inserted, notify the side that didn't act.
create or replace function private.notify_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text;
begin
  if new.other_id is distinct from (select auth.uid()) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.relation = old.relation then
    return null;
  end if;
  select pr.name into actor from public.profiles pr where pr.id = new.other_id;
  perform private.send_push(
    new.user_id,
    case new.relation when 'pareja' then actor || ' es ahora tu pareja en Planazo 💜' else actor || ' se ha unido a tus planes' end,
    'Ya podéis proponeros planes.',
    jsonb_build_object('url', '/perfil', 'type', 'connection')
  );
  return null;
end;
$$;

create trigger connections_notify after insert or update of relation on public.connections
for each row execute function private.notify_connection();

revoke execute on function private.send_push(uuid, text, text, jsonb), private.notify_invitation(), private.notify_connection()
  from public, anon, authenticated;
