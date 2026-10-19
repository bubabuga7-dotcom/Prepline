-- Prepline stage 11: the league counts every test, not only live rooms and duels.
-- Run once in Supabase → SQL Editor, AFTER stage3.sql and stage5.sql.
--
-- Points per season (calendar month, Astana time):
--   1 point  for every question answered correctly in a live room or a duel (as before)
--   1 point  for every question answered correctly in a normal test or in Train by topic;
--            each question counts once per season, so retaking the same test does not add points
--   +5       for every duel won (as before)
-- Games: live rooms, duels and full tests (single questions from Train by topic are not games).
-- Name in the table: the last name used in a live room; otherwise the start of the email, masked
-- (for example "bu•••7"), so other students never see anyone's full email.

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
  ), g as (     -- one row per player per ended live room / duel in the season
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
  ), rt as (
    select g.user_id, count(*)::int as games, sum(g.correct)::int as correct, sum(g.answered)::int as answered
    from g group by g.user_id
  ), aq as (    -- every answered question in tests and topic practice, one row per question
    select a.user_id, a.mock_id, x.q, x.mk, a.id as attempt_id
    from answer_attempts a
    cross join b
    cross join lateral unnest(a.q_ids, string_to_array(a.marks, null)) as x(q, mk)
    where a.created_at >= b.s and a.created_at < b.e
  ), tq as (    -- a question counts once per season: right if it was ever answered right
    select user_id, mock_id, q, bool_or(mk = 'c') as ok, bool_or(mk <> 's') as tried
    from aq group by user_id, mock_id, q
  ), tt as (
    select tq.user_id,
           count(*) filter (where tq.ok)::int    as correct,
           count(*) filter (where tq.tried)::int as answered,
           (select count(distinct aq.attempt_id) from aq join answer_attempts f on f.id = aq.attempt_id
             where aq.user_id = tq.user_id and cardinality(f.q_ids) > 1)::int as games
    from tq group by tq.user_id
  ), t as (
    select u.user_id,
           (coalesce(rt.games, 0)    + coalesce(tt.games, 0))::int    as games,
           (coalesce(rt.correct, 0)  + coalesce(tt.correct, 0))::int  as correct,
           (coalesce(rt.answered, 0) + coalesce(tt.answered, 0))::int as answered,
           coalesce(w.wins, 0)::int                                   as duel_wins
    from (select user_id from rt union select user_id from tt) u
    left join rt on rt.user_id = u.user_id
    left join tt on tt.user_id = u.user_id
    left join w  on w.user_id  = u.user_id
  ), nm as (    -- latest display name used in any live room
    select distinct on (p.user_id) p.user_id, p.name
    from room_players p
    order by p.user_id, p.joined_at desc
  ), s as (
    select t.*,
           coalesce(nullif(trim(nm.name), ''),
                    case when char_length(split_part(au.email, '@', 1)) <= 4 then left(au.email, 1) || '•••'
                         else left(split_part(au.email, '@', 1), 2) || '•••' || right(split_part(au.email, '@', 1), 1) end,
                    'Student') as name,
           (t.correct + 5 * t.duel_wins)::int                        as points,
           round(100.0 * t.correct / nullif(t.answered, 0))::int     as accuracy
    from t
    left join nm on nm.user_id = t.user_id
    left join auth.users au on au.id = t.user_id
    where t.answered > 0
  ), ranked as (
    select s.*,
           rank() over (order by s.points desc, s.accuracy desc)::int as rnk,
           case when s.points >= 150 and 100.0 * s.correct / nullif(s.answered, 0) >= 88 then '210+ Club'
                when s.points >= 150 then 'Gold'
                when s.points >= 50  then 'Silver'
                else 'Bronze' end                                    as tier
    from s
  )
  select r.rnk, r.name, r.points, r.games, r.correct, r.answered, coalesce(r.accuracy, 0), r.duel_wins,
         r.tier, r.user_id = auth.uid(), b.s, b.e
  from ranked r cross join b
  where r.rnk <= 50 or r.user_id = auth.uid()
  union all     -- always return the season bounds, even when nobody has played yet
  select null, null, null, null, null, null, null, null, null, null, b.s, b.e from b
  order by 1 nulls last, 2;
$$;

revoke all on function public.league_table(boolean) from public, anon;
grant execute on function public.league_table(boolean) to authenticated;
