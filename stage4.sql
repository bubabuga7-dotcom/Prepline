-- Prepline stage 4: explanations written by students.
-- Run once in Supabase → SQL Editor, AFTER stage3.sql.
--
-- Rules
--   * Only signed-in students who have attempted the question (normal test or live room) can write.
--   * 30–1500 characters, plain text. At most 15 explanations per student per 24 hours.
--   * "Helpful" votes sort the list. 3 reports from different students hide an explanation automatically.
--   * Moderation: Table Editor → explanations → set status to 'visible' / 'hidden' / 'removed'.
--     The view explanations_moderation lists reported and newest explanations first.

create table if not exists public.explanations (
  id         bigint generated always as identity primary key,
  mock_id    text not null,
  q_id       int  not null,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  body       text not null check (char_length(btrim(body)) between 30 and 1500),
  status     text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists explanations_q on public.explanations (mock_id, q_id);

create table if not exists public.explanation_votes (
  expl_id bigint not null references public.explanations(id) on delete cascade,
  user_id uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (expl_id, user_id)
);

create table if not exists public.explanation_reports (
  expl_id    bigint not null references public.explanations(id) on delete cascade,
  user_id    uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  reason     text   check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  primary key (expl_id, user_id)
);

-- has this student attempted the question? (normal test log or a live room of the same mock)
create or replace function public.attempted_question(p_mock text, p_q int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from answer_log l
                 where l.user_id = auth.uid() and l.mock_id = p_mock and l.q_id = p_q)
      or exists (select 1 from room_answers a join rooms r on r.id = a.room_id
                 where a.user_id = auth.uid() and r.mock_id = p_mock and a.q_id = p_q);
$$;

create or replace function public.explanations_today()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from explanations
  where user_id = auth.uid() and created_at > now() - interval '24 hours';
$$;

alter table public.explanations        enable row level security;
alter table public.explanation_votes   enable row level security;
alter table public.explanation_reports enable row level security;

drop policy if exists expl_read   on public.explanations;
drop policy if exists expl_write  on public.explanations;
drop policy if exists expl_delete on public.explanations;
create policy expl_read on public.explanations for select to anon, authenticated
  using (status = 'visible' or user_id = auth.uid());
create policy expl_write on public.explanations for insert to authenticated with check (
  user_id = auth.uid() and status = 'visible'
  and public.attempted_question(mock_id, q_id)
  and public.explanations_today() < 15);
create policy expl_delete on public.explanations for delete to authenticated using (user_id = auth.uid());
-- no update policy: students cannot edit status; edits = delete and write again

drop policy if exists votes_read  on public.explanation_votes;
drop policy if exists votes_write on public.explanation_votes;
drop policy if exists votes_del   on public.explanation_votes;
create policy votes_read  on public.explanation_votes for select to authenticated using (user_id = auth.uid());
create policy votes_write on public.explanation_votes for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.explanations e where e.id = expl_id and e.user_id <> auth.uid()));
create policy votes_del   on public.explanation_votes for delete to authenticated using (user_id = auth.uid());

drop policy if exists rep_write on public.explanation_reports;
create policy rep_write on public.explanation_reports for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.explanations e where e.id = expl_id and e.user_id <> auth.uid()));

-- 3 reports from different students → hidden until you review it
create or replace function public.explanation_autohide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from explanation_reports where expl_id = new.expl_id) >= 3 then
    update explanations set status = 'hidden' where id = new.expl_id and status = 'visible';
  end if;
  return new;
end $$;
drop trigger if exists explanation_autohide on public.explanation_reports;
create trigger explanation_autohide after insert on public.explanation_reports
  for each row execute function public.explanation_autohide();

-- how many visible explanations each question of a mock has
create or replace function public.explanation_counts(p_mock text)
returns table (q_id int, n int)
language sql stable security definer set search_path = public as $$
  select e.q_id, count(*)::int from explanations e
  where e.mock_id = p_mock and e.status = 'visible'
  group by e.q_id;
$$;

-- explanations of one question, most helpful first; your own hidden ones are included for you
create or replace function public.explanations_for(p_mock text, p_q int)
returns table (id bigint, name text, body text, helpful int, voted boolean, mine boolean,
               status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.body,
         (select count(*) from explanation_votes v where v.expl_id = e.id)::int,
         exists (select 1 from explanation_votes v where v.expl_id = e.id and v.user_id = auth.uid()),
         coalesce(e.user_id = auth.uid(), false), e.status, e.created_at
  from explanations e
  where e.mock_id = p_mock and e.q_id = p_q
    and (e.status = 'visible' or e.user_id = auth.uid())
  order by 4 desc, e.created_at asc;
$$;

-- for you in Table Editor / SQL Editor
create or replace view public.explanations_moderation as
  select e.id, e.status, e.mock_id, e.q_id, e.name, e.body,
         (select count(*) from explanation_reports r where r.expl_id = e.id) as reports,
         (select string_agg(r.reason, ' | ') from explanation_reports r where r.expl_id = e.id) as reasons,
         (select count(*) from explanation_votes v where v.expl_id = e.id) as helpful,
         e.created_at
  from explanations e
  order by reports desc, e.created_at desc;
revoke all on public.explanations_moderation from anon, authenticated;

revoke all on function public.attempted_question(text, int) from public, anon;
revoke all on function public.explanations_today() from public, anon;
revoke all on function public.explanation_counts(text) from public;
revoke all on function public.explanations_for(text, int) from public;
grant execute on function public.attempted_question(text, int) to authenticated;
grant execute on function public.explanations_today() to authenticated;
grant execute on function public.explanation_counts(text) to anon, authenticated;
grant execute on function public.explanations_for(text, int) to anon, authenticated;
grant select, insert, delete on public.explanations to authenticated;
grant select on public.explanations to anon;
grant select, insert, delete on public.explanation_votes to authenticated;
grant insert on public.explanation_reports to authenticated;
