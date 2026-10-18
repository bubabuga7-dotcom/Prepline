-- Prepline stage 7: admin statistics (admin.html).
-- Run once in Supabase → SQL Editor, AFTER stage6.sql.
--
-- Only accounts listed in public.admins can call admin_stats(). Everyone else gets an error.
-- The last statement below makes the account with the e-mail bubabuga7@gmail.com an admin.
-- If you signed up on the site with another e-mail, change it there before running.
-- More admins later:  insert into public.admins (user_id) select id from auth.users where email = '...';

create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no policies: nobody can read or change it from the site
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public, auth as $$
declare
  out json;
  reports_open int := null;
  astana text := 'Asia/Almaty';     -- UTC+5, same as Astana
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin' using errcode = '42501';
  end if;

  -- question_reports was created outside the numbered stages; count it only if it is there
  begin
    execute 'select count(*) from public.question_reports where coalesce(status, ''open'') not in (''fixed'', ''rejected'')' into reports_open;
  exception when others then reports_open := null;
  end;

  with
  days as (
    select (now() at time zone astana)::date - g as d from generate_series(0, 13) g
  ),
  activity as (                      -- who did something, and when
    select user_id, created_at as at from public.results
    union all
    select user_id, created_at from public.answer_attempts
  ),
  q as (                              -- every answered question in compact attempts
    select a.mock_id, x.q_id, substr(a.marks, x.i::int, 1) as m
    from public.answer_attempts a
    cross join lateral unnest(a.q_ids) with ordinality as x(q_id, i)
  )
  select json_build_object(
    'generated_at',     now(),
    'users_total',      (select count(*) from auth.users),
    'users_confirmed',  (select count(*) from auth.users where email_confirmed_at is not null),
    'users_7d',         (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d',        (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_today',     (select count(distinct user_id) from activity where (at at time zone astana)::date = (now() at time zone astana)::date),
    'active_7d',        (select count(distinct user_id) from activity where at > now() - interval '7 days'),
    'active_30d',       (select count(distinct user_id) from activity where at > now() - interval '30 days'),
    'tests_total',      (select count(*) from public.results),
    'tests_7d',         (select count(*) from public.results where created_at > now() - interval '7 days'),
    'answers_total',    (select count(*) from q),
    'rooms_total',      (select count(*) from public.rooms),
    'rooms_7d',         (select count(*) from public.rooms where created_at > now() - interval '7 days'),
    'explanations',     (select count(*) from public.explanations where status = 'visible'),
    'deck_cards',       (select count(*) from public.review_cards),
    'reports_open',     reports_open,
    'by_day', (
      select json_agg(json_build_object(
        'day', d.d,
        'signups', (select count(*) from auth.users u where (u.created_at at time zone astana)::date = d.d),
        'active',  (select count(distinct user_id) from activity a where (a.at at time zone astana)::date = d.d),
        'tests',   (select count(*) from public.results r where (r.created_at at time zone astana)::date = d.d)
      ) order by d.d) from days d
    ),
    'top_tests', (
      select coalesce(json_agg(t order by t.attempts desc), '[]'::json) from (
        select mock_id, count(*) as attempts, count(distinct user_id) as students,
               round(avg(score::numeric / nullif(total, 0)) * 100) as avg_pct
        from public.results group by mock_id order by count(*) desc limit 15
      ) t
    ),
    'hardest', (                      -- most-missed questions with at least 5 answers: worth checking the key
      select coalesce(json_agg(h order by h.wrong_pct desc, h.answers desc), '[]'::json) from (
        select mock_id, q_id, count(*) as answers,
               round(100.0 * count(*) filter (where m = 'w') / count(*)) as wrong_pct,
               round(100.0 * count(*) filter (where m = 's') / count(*)) as skipped_pct
        from q group by mock_id, q_id having count(*) >= 5
        order by 4 desc, 3 desc limit 15
      ) h
    )
  ) into out;
  return out;
end $$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- make yourself an admin (change the e-mail if your site account uses another one)
insert into public.admins (user_id)
select id from auth.users where email = 'bubabuga7@gmail.com'
on conflict do nothing;

-- check: should return one row with your e-mail
select u.email from public.admins a join auth.users u on u.id = a.user_id;
