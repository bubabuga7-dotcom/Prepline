-- Prepline stage 2: duels, difficulty map, challenge of the week.
-- Run once in Supabase → SQL Editor, AFTER live-rooms.sql.
-- All difficulty numbers come only from live rooms and duels (supervised), never from normal practice.

-- ---------- duels ----------
alter table public.rooms add column if not exists mode  text  not null default 'room';
alter table public.rooms add column if not exists q_ids int[];
alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms add  constraint rooms_mode_check check (mode in ('room','duel'));

-- live score, shown to the opponent during a duel
alter table public.room_players add column if not exists correct_live int not null default 0;

-- a duel holds at most 2 players
drop policy if exists players_join on public.room_players;
create policy players_join on public.room_players for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.rooms r where r.id = room_id and r.status in ('lobby','running')
              and (r.mode <> 'duel'
                   or (select count(*) from public.room_players p where p.room_id = r.id) < 2)));

-- ---------- difficulty of each question of a mock (all ended rooms and duels) ----------
-- Returned only for questions answered by at least 5 students, so one person cannot define it.
create or replace function public.mock_difficulty(p_mock text)
returns table (q_id int, players int, wrong int)
language sql stable security definer set search_path = public as $$
  select a.q_id, count(*)::int, count(*) filter (where not a.correct)::int
  from room_answers a
  join rooms r on r.id = a.room_id
  where r.mock_id = p_mock and (r.status = 'finished' or r.ends_at < now())
  group by a.q_id
  having count(*) >= 5
  order by a.q_id;
$$;

-- ---------- challenge of the week ----------
-- The question with the lowest share of correct answers among questions answered by 5+ students
-- in rooms that ended during the last 7 days; if there are none, over all time.
create or replace function public.weekly_challenge()
returns table (mock_id text, q_id int, players int, wrong int, recent boolean)
language sql stable security definer set search_path = public as $$
  with s as (
    select r.mock_id, a.q_id, count(*)::int as players,
           count(*) filter (where not a.correct)::int as wrong
    from room_answers a join rooms r on r.id = a.room_id
    where (r.status = 'finished' or r.ends_at < now())
    group by r.mock_id, a.q_id
    having count(*) >= 5
  ), w as (
    select r.mock_id, a.q_id, count(*)::int as players,
           count(*) filter (where not a.correct)::int as wrong, true as recent
    from room_answers a join rooms r on r.id = a.room_id
    where (r.status = 'finished' or r.ends_at < now())
      and coalesce(r.ends_at, r.created_at) > now() - interval '7 days'
    group by r.mock_id, a.q_id
    having count(*) >= 5
  )
  select * from (
    (select mock_id, q_id, players, wrong, true  from w order by wrong::float8 / players desc, players desc limit 1)
    union all
    (select mock_id, q_id, players, wrong, false from s order by wrong::float8 / players desc, players desc limit 1)
  ) x
  order by 5 desc
  limit 1;
$$;

revoke all on function public.mock_difficulty(text) from public;
revoke all on function public.weekly_challenge() from public;
grant execute on function public.mock_difficulty(text) to anon, authenticated;
grant execute on function public.weekly_challenge() to anon, authenticated;
