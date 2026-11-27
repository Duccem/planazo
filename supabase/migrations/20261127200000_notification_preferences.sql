-- Planazo · Notification preferences.
--
-- One row per user with a switch per kind of push. No row = everything on, so existing users
-- keep receiving notifications and the app only writes a row once the user changes something.
-- private.send_push checks the switch that matches `data.type` before calling the Edge Function.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  invitations boolean not null default true,          -- "X te propone un plan"
  invitation_responses boolean not null default true, -- "X se apunta / quizás / no puede"
  connections boolean not null default true,          -- "X se ha unido a tus planes"
  updated_at timestamptz not null default now()
);
comment on table public.notification_preferences is 'Which push notifications each user wants. Missing row means all enabled.';

create trigger notification_preferences_touch before update on public.notification_preferences
for each row execute function private.touch_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notification_preferences: read own" on public.notification_preferences
for select to authenticated
using (user_id = (select auth.uid()));

create policy "notification_preferences: insert own" on public.notification_preferences
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "notification_preferences: update own" on public.notification_preferences
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on public.notification_preferences from anon;
revoke update, delete, truncate on public.notification_preferences from authenticated;
-- The app upserts, which sets user_id in ON CONFLICT DO UPDATE; RLS keeps it pinned to auth.uid().
grant update (user_id, invitations, invitation_responses, connections) on public.notification_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- Sending: same as before, plus the preference check.
-- ---------------------------------------------------------------------------

create or replace function private.wants_push(recipient uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case kind
        when 'invitation' then p.invitations
        when 'invitation_response' then p.invitation_responses
        when 'connection' then p.connections
        else true
      end
      from public.notification_preferences p
      where p.user_id = recipient
    ),
    true
  );
$$;

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
  if not private.wants_push(recipient, data ->> 'type') then
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

revoke execute on function private.wants_push(uuid, text), private.send_push(uuid, text, text, jsonb)
  from public, anon, authenticated;
