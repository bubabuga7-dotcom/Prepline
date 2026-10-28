-- Prepline stage 16: the twin's history in the cloud.
-- Append-only event log: each mistake in the Formula quiz, each round and each delayed check is one row with a
-- client-made UUID. The state of every crack is rebuilt from the events in time order, so a re-sent event is
-- ignored (same id) and an older event from another device can never overwrite a newer one.

create table if not exists public.twin_events (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trap       text not null check (trap ~ '^[a-z0-9-]{1,40}$'),
  kind       text not null check (kind in ('seen', 'round', 'check')),
  at         timestamptz not null,
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 4000),
  created_at timestamptz not null default now()
);
create index if not exists twin_events_user_at on public.twin_events (user_id, at);

alter table public.twin_events enable row level security;
drop policy if exists twin_read on public.twin_events;
create policy twin_read on public.twin_events for select to authenticated using (user_id = auth.uid());
drop policy if exists twin_add on public.twin_events;
create policy twin_add on public.twin_events for insert to authenticated with check (user_id = auth.uid());
-- no update or delete policy: history cannot be rewritten from the browser
revoke all on public.twin_events from anon;
grant select, insert on public.twin_events to authenticated;
