-- Prepline stage 9: Premium.
-- Run once in Supabase → SQL Editor, AFTER stage8.sql.
--
-- premium.until is the moment Premium ends. Lemon Squeezy payments set it through the lemon-webhook
-- Edge Function; the admin page can also give Premium by hand (admin_grant_premium).

create table if not exists public.premium (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  until      timestamptz not null,
  source     text not null default 'lemon',          -- 'lemon' or 'admin'
  ls_subscription text,                               -- Lemon Squeezy subscription id
  status     text,                                    -- Lemon Squeezy status: active, cancelled, expired, past_due…
  updated_at timestamptz not null default now()
);
alter table public.premium enable row level security;  -- no policies: read through the functions below
revoke all on public.premium from anon, authenticated;

-- the signed-in student's own Premium: null if none, otherwise the end date (may be in the past)
create or replace function public.my_premium() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('until', until, 'active', until > now(), 'status', status, 'source', source)
  from premium where user_id = auth.uid();
$$;
revoke all on function public.my_premium() from public, anon;
grant execute on function public.my_premium() to authenticated;

-- admin: give or extend Premium by e-mail; p_days = 0 removes it
create or replace function public.admin_grant_premium(p_email text, p_days int) returns json
language plpgsql volatile security definer set search_path = public, auth as $$
declare uid uuid; new_until timestamptz;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'no account with this e-mail'; end if;
  if p_days <= 0 then
    delete from public.premium where user_id = uid;
    return json_build_object('email', p_email, 'until', null);
  end if;
  insert into public.premium as p (user_id, until, source, status, updated_at)
  values (uid, now() + make_interval(days => p_days), 'admin', 'active', now())
  on conflict (user_id) do update
    set until = greatest(p.until, now()) + make_interval(days => p_days), source = 'admin', status = 'active', updated_at = now()
  returning until into new_until;
  return json_build_object('email', p_email, 'until', new_until);
end $$;
revoke all on function public.admin_grant_premium(text, int) from public, anon;
grant execute on function public.admin_grant_premium(text, int) to authenticated;

-- admin: list of Premium students
create or replace function public.admin_premium_list() returns json
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  return (select coalesce(json_agg(json_build_object('email', u.email, 'until', p.until, 'active', p.until > now(),
                                                     'source', p.source, 'status', p.status) order by p.until desc), '[]'::json)
          from public.premium p join auth.users u on u.id = p.user_id);
end $$;
revoke all on function public.admin_premium_list() from public, anon;
grant execute on function public.admin_premium_list() to authenticated;
