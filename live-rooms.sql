-- Prepline live rooms (Quizizz-style): run once in Supabase → SQL Editor.
-- Students join one mock with a code and start together. Each student's answers are private
-- until the room ends; then the server computes scores where a question's weight depends on
-- how many people in THIS room got it wrong.

-- ---------- rooms ----------
create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null check (code ~ '^[A-Z0-9]{6}$'),
  host_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mock_id      text not null,
  duration_sec int  not null check (duration_sec between 60 and 14400),
  status       text not null default 'lobby' check (status in ('lobby','running','finished')),
  started_at   timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.rooms enable row level security;
drop policy if exists rooms_read   on public.rooms;
drop policy if exists rooms_create on public.rooms;
drop policy if exists rooms_host   on public.rooms;
create policy rooms_read   on public.rooms for select to authenticated using (true);
create policy rooms_create on public.rooms for insert to authenticated with check (host_id = auth.uid());
create policy rooms_host   on public.rooms for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());

-- ---------- players (progress only: visible to everyone in the room) ----------
create table if not exists public.room_players (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 40),
  answered  int  not null default 0,
  finished  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.room_players enable row level security;
drop policy if exists players_read on public.room_players;
drop policy if exists players_join on public.room_players;
drop policy if exists players_self on public.room_players;
create policy players_read on public.room_players for select to authenticated using (true);
create policy players_join on public.room_players for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.rooms r where r.id = room_id and r.status in ('lobby','running')));
create policy players_self on public.room_players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- answers (private: each student sees only their own) ----------
create table if not exists public.room_answers (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  q_id    int  not null,
  correct boolean not null,
  primary key (room_id, user_id, q_id)
);
alter table public.room_answers enable row level security;
drop policy if exists answers_own_read  on public.room_answers;
drop policy if exists answers_own_write on public.room_answers;
drop policy if exists answers_own_upd   on public.room_answers;
create policy answers_own_read  on public.room_answers for select to authenticated using (user_id = auth.uid());
-- accepted while the room runs, plus 2 minutes of grace for slow connections
create policy answers_own_write on public.room_answers for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.rooms r where r.id = room_id and r.status <> 'lobby'
              and r.started_at is not null and now() <= r.ends_at + interval '2 minutes'));
create policy answers_own_upd on public.room_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- results: only after the room has ended ----------
-- weight = 1 + 2·p,  p = (wrong + 1) / (players + 2)   (light smoothing for small rooms)
-- score  = 120 · Σ weight of correct answers / Σ weight of all scored questions
create or replace function public.room_question_stats(p_room uuid)
returns table (q_id int, players int, wrong int, weight float8)
language sql stable security definer set search_path = public as $$
  select a.q_id, count(*)::int, count(*) filter (where not a.correct)::int,
         1 + 2 * ((count(*) filter (where not a.correct))::float8 + 1) / (count(*)::float8 + 2)
  from room_answers a
  where a.room_id = p_room
    and exists (select 1 from rooms r where r.id = p_room and (r.status = 'finished' or r.ends_at < now()))
  group by a.q_id
  order by a.q_id;
$$;

create or replace function public.room_results(p_room uuid)
returns table (user_id uuid, name text, raw int, total int, score int, finished boolean)
language sql stable security definer set search_path = public as $$
  with w as (select s.q_id, s.weight from room_question_stats(p_room) s)
  select p.user_id, p.name,
         count(*) filter (where a.correct)::int,
         count(a.q_id)::int,
         coalesce(round(120 * sum(case when a.correct then w.weight else 0 end) / nullif(sum(w.weight), 0)), 0)::int,
         p.finished
  from room_players p
  left join room_answers a on a.room_id = p.room_id and a.user_id = p.user_id
  left join w on w.q_id = a.q_id
  where p.room_id = p_room
    and exists (select 1 from rooms r where r.id = p_room and (r.status = 'finished' or r.ends_at < now()))
  group by p.user_id, p.name, p.finished
  order by 5 desc, 3 desc, p.name;
$$;

revoke all on function public.room_question_stats(uuid) from public, anon;
revoke all on function public.room_results(uuid) from public, anon;
grant execute on function public.room_question_stats(uuid) to authenticated;
grant execute on function public.room_results(uuid) to authenticated;
