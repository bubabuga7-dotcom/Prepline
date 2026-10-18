-- Prepline stage 8: count every visitor, including students who never sign in.
-- Run once in Supabase → SQL Editor, AFTER stage7.sql.
--
-- Each browser gets a random id (no name, no e-mail, nothing personal). Once a day it records "visit",
-- and "test" when a test is finished. The admin page (admin.html) shows unique devices per day, 7 and 30 days.

create table if not exists public.device_days (
  device text not null check (char_length(device) between 8 and 40),
  day    date not null,
  kind   text not null check (kind in ('visit', 'test')),
  primary key (device, day, kind)
);
alter table public.device_days enable row level security;   -- no policies: the site writes only through track()
revoke all on public.device_days from anon, authenticated;

create or replace function public.track(p_device text, p_kind text) returns void
language sql volatile security definer set search_path = public as $$
  insert into device_days (device, day, kind)
  select p_device, (now() at time zone 'Asia/Almaty')::date, p_kind
  where p_kind in ('visit', 'test') and char_length(p_device) between 8 and 40
  on conflict do nothing;
$$;
revoke all on function public.track(text, text) from public;
grant execute on function public.track(text, text) to anon, authenticated;

create or replace function public.admin_traffic() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Almaty')::date;
  out json;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  select json_build_object(
    'visitors_today', (select count(distinct device) from device_days where kind = 'visit' and day = today),
    'visitors_7d',    (select count(distinct device) from device_days where kind = 'visit' and day > today - 7),
    'visitors_30d',   (select count(distinct device) from device_days where kind = 'visit' and day > today - 30),
    'testers_today',  (select count(distinct device) from device_days where kind = 'test' and day = today),
    'testers_7d',     (select count(distinct device) from device_days where kind = 'test' and day > today - 7),
    'testers_30d',    (select count(distinct device) from device_days where kind = 'test' and day > today - 30),
    'returning_7d',   (select count(*) from (select device from device_days where kind = 'visit' and day > today - 7
                                             group by device having count(*) >= 2) r),
    'by_day', (select json_agg(json_build_object(
        'day', d,
        'visitors', (select count(distinct device) from device_days where kind = 'visit' and day = d),
        'testers',  (select count(distinct device) from device_days where kind = 'test' and day = d)
      ) order by d) from generate_series(today - 13, today, interval '1 day') g(d0), lateral (select g.d0::date as d) x)
  ) into out;
  return out;
end $$;
revoke all on function public.admin_traffic() from public, anon;
grant execute on function public.admin_traffic() to authenticated;
