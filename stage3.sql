-- Prepline stage 3: monthly leagues.
-- Run once in Supabase → SQL Editor, AFTER live-rooms.sql and stage2.sql.
-- Only live rooms and duels count (supervised), never normal practice tests.
--
-- A season is one calendar month, Kazakhstan time (UTC+5). Points reset on the 1st.
--   points   = correct answers in rooms and duels that ended this month + 5 per duel won
--   accuracy = correct / answered over the same games
--   tier     = 210+ Club : 150+ points and accuracy >= 88%  (210 of 240 = 87.5%)
--              Gold      : 150+ points
--              Silver    : 50+ points
--              Bronze    : anything above zero

drop function if exists public.league_table(boolean);

create or replace function public.league_table(p_prev boolean default false)
returns table (rank int, name text, points int, games int, correct int, answered int,
               accuracy int, duel_wins int, tier text, me boolean,
               season_start timestamptz, season_end timestamptz)
language sql stable security definer set search_path = public as $$
  with m as (   -- local month start (UTC+5) as a plain timestamp
    select date_trunc('month', (now() at time zone 'UTC') + interval '5 hours')
           - case when p_prev then interval '1 month' else interval '0' end as ls
  ), b as (
    select (ls at time zone 'UTC') - interval '5 hours'                       as s,
           ((ls + interval '1 month') at time zone 'UTC') - interval '5 hours' as e
    from m
  ), g as (     -- one row per player per ended game in the season
    select r.id as room_id, r.mode, a.user_id,
           count(*) filter (where a.correct)::int as correct,
           count(*)::int as answered
    from rooms r
    join room_answers a on a.room_id = r.id
    cross join b
    where (r.status = 'finished' or r.ends_at < now())
      and coalesce(r.ends_at, r.created_at) >= b.s
      and coalesce(r.ends_at, r.created_at) <  b.e
    group by r.id, r.mode, a.user_id
  ), w as (     -- duel winners: strictly more correct answers than the opponent
    select g1.user_id, count(*)::int as wins
    from g g1 join g g2 on g2.room_id = g1.room_id and g2.user_id <> g1.user_id
    where g1.mode = 'duel' and g1.correct > g2.correct
    group by g1.user_id
  ), nm as (    -- latest display name used in the season
    select distinct on (p.user_id) p.user_id, p.name
    from room_players p join g on g.room_id = p.room_id and g.user_id = p.user_id
    order by p.user_id, p.joined_at desc
  ), t as (
    select g.user_id,
           count(*)::int                         as games,
           sum(g.correct)::int                   as correct,
           sum(g.answered)::int                  as answered,
           coalesce(max(w.wins), 0)::int         as duel_wins
    from g left join w on w.user_id = g.user_id
    group by g.user_id
  ), s as (
    select t.*, nm.name,
           (t.correct + 5 * t.duel_wins)::int                        as points,
           round(100.0 * t.correct / nullif(t.answered, 0))::int     as accuracy
    from t join nm on nm.user_id = t.user_id
  ), ranked as (
    select s.*,
           rank() over (order by s.points desc, s.accuracy desc)::int as rnk,
           case when s.points >= 150 and 100.0 * s.correct / nullif(s.answered, 0) >= 88 then '210+ Club'
                when s.points >= 150 then 'Gold'
                when s.points >= 50  then 'Silver'
                else 'Bronze' end                                    as tier
    from s
  )
  select r.rnk, r.name, r.points, r.games, r.correct, r.answered, r.accuracy, r.duel_wins,
         r.tier, r.user_id = auth.uid(), b.s, b.e
  from ranked r cross join b
  where r.rnk <= 50 or r.user_id = auth.uid()
  union all     -- always return the season bounds, even when nobody has played yet
  select null, null, null, null, null, null, null, null, null, null, b.s, b.e from b
  order by 1 nulls last, 2;
$$;

revoke all on function public.league_table(boolean) from public, anon;
grant execute on function public.league_table(boolean) to authenticated;
