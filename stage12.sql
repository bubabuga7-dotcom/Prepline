-- Prepline stage 12: day streak for Quick 10 / Premium, and counting who STARTS a test (not only who finishes).
-- Applied through the Supabase connector; kept here so the repo has the full schema history.

-- 1) "start": recorded once a day per device when the first answer in a test is given
alter table public.device_days drop constraint if exists device_days_kind_check;
alter table public.device_days add constraint device_days_kind_check check (kind in ('visit', 'start', 'test'));

create or replace function public.track(p_device text, p_kind text) returns void
language sql volatile security definer set search_path = public as $$
  insert into device_days (device, day, kind)
  select p_device, (now() at time zone 'Asia/Almaty')::date, p_kind
  where p_kind in ('visit', 'start', 'test') and char_length(p_device) between 8 and 40
  on conflict do nothing;
$$;
revoke all on function public.track(text, text) from public;
grant execute on function public.track(text, text) to anon, authenticated;

-- 2) streak: consecutive days (Astana time) with at least one answered question, from answer_attempts.
--    A streak is still alive if the last active day was yesterday.
create or replace function public.my_streak() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Asia/Almaty')::date;
  d date;
  n int := 0;
  today_q int := 0;
  best int := 0;
  run int := 0;
  prev date := null;
begin
  if me is null then return json_build_object('streak', 0, 'today', 0, 'best', 0, 'active_today', false); end if;

  select coalesce(sum(length(replace(marks, 's', ''))), 0) into today_q
  from answer_attempts where user_id = me and (created_at at time zone 'Asia/Almaty')::date = today;

  -- current streak, walking back from today (or yesterday)
  d := today;
  if not exists (select 1 from answer_attempts where user_id = me and (created_at at time zone 'Asia/Almaty')::date = today) then
    d := today - 1;
  end if;
  while exists (select 1 from answer_attempts where user_id = me and (created_at at time zone 'Asia/Almaty')::date = d) loop
    n := n + 1; d := d - 1;
  end loop;

  -- best streak ever
  for d in select distinct (created_at at time zone 'Asia/Almaty')::date as day
           from answer_attempts where user_id = me order by 1 loop
    if prev is not null and d = prev + 1 then run := run + 1; else run := 1; end if;
    if run > best then best := run; end if;
    prev := d;
  end loop;

  return json_build_object('streak', n, 'today', today_q, 'best', greatest(best, n), 'active_today', today_q > 0);
end;
$$;
revoke all on function public.my_streak() from public;
grant execute on function public.my_streak() to authenticated;
