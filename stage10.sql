-- Prepline stage 10: requests from rights holders (copyright.html).
-- Run once in Supabase → SQL Editor, AFTER stage9.sql.
--
-- Anyone can send a request (no account needed); only admins can read them, on admin.html.

create table if not exists public.rights_requests (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 200),
  email       text not null check (char_length(email) between 3 and 200),
  organisation text check (char_length(organisation) <= 200),
  materials   text not null check (char_length(materials) between 1 and 4000),
  message     text check (char_length(message) <= 4000),
  status      text not null default 'new'            -- new / removed / answered
);
alter table public.rights_requests enable row level security;
revoke all on public.rights_requests from anon, authenticated;
grant insert (name, email, organisation, materials, message) on public.rights_requests to anon, authenticated;
drop policy if exists "anyone can send a request" on public.rights_requests;
create policy "anyone can send a request" on public.rights_requests for insert to anon, authenticated with check (status = 'new');

create or replace function public.admin_rights_requests() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from public.rights_requests r);
end $$;
revoke all on function public.admin_rights_requests() from public, anon;
grant execute on function public.admin_rights_requests() to authenticated;
