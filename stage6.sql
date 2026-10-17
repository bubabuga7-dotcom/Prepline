-- Prepline stage 6: mistakes deck (spaced review).
-- Run once in Supabase → SQL Editor, AFTER stage5.sql.
--
-- Every question a student gets wrong (full test, challenge, live room, duel) becomes a card.
-- Schedule: wrong → back in 1 day. Correct in review: box 0 → 1 (next in 3 days),
-- box 1 → 2 (next in 7 days), box 2 → mastered (card removed). Wrong in review → box 0, 1 day.
-- Skipped questions (time ran out) are not added. Cards are created by the database (triggers),
-- students can only read their own cards and answer them through review_answer().

create table if not exists public.review_cards (
  user_id     uuid not null references auth.users(id) on delete cascade,
  mock_id     text not null,
  q_id        int  not null,
  box         smallint not null default 0 check (box between 0 and 2),
  due_at      timestamptz not null default now() + interval '1 day',
  added_at    timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (user_id, mock_id, q_id)
);
create index if not exists review_cards_due on public.review_cards (user_id, due_at);

alter table public.review_cards enable row level security;
drop policy if exists cards_read on public.review_cards;
create policy cards_read on public.review_cards for select to authenticated using (user_id = auth.uid());
grant select on public.review_cards to authenticated;

-- ---------- cards from finished tests (compact attempts) ----------
create or replace function public.cards_from_attempt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into review_cards (user_id, mock_id, q_id, box, due_at)
  select new.user_id, new.mock_id, x.q_id, 0, now() + interval '1 day'
  from unnest(new.q_ids) with ordinality as x(q_id, i)
  where substr(new.marks, x.i::int, 1) = 'w'
  on conflict (user_id, mock_id, q_id) do update set box = 0, due_at = excluded.due_at;
  return new;
end $$;
drop trigger if exists cards_from_attempt on public.answer_attempts;
create trigger cards_from_attempt after insert on public.answer_attempts
  for each row execute function public.cards_from_attempt();

-- ---------- cards from live rooms and duels ----------
create or replace function public.cards_from_room() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.correct then
    insert into review_cards (user_id, mock_id, q_id, box, due_at)
    select new.user_id, r.mock_id, new.q_id, 0, now() + interval '1 day'
    from rooms r where r.id = new.room_id
    on conflict (user_id, mock_id, q_id) do update set box = 0, due_at = excluded.due_at;
  end if;
  return new;
end $$;
drop trigger if exists cards_from_room on public.room_answers;
create trigger cards_from_room after insert or update of correct on public.room_answers
  for each row execute function public.cards_from_room();

-- ---------- reading the deck ----------
create or replace function public.deck_summary()
returns table (due int, total int, next_due timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where due_at <= now())::int, count(*)::int,
         min(due_at) filter (where due_at > now())
  from review_cards where user_id = auth.uid();
$$;

-- due cards first; with p_early, also cards that are not due yet ("review early")
create or replace function public.deck_cards(p_early boolean default false, p_limit int default 20)
returns table (mock_id text, q_id int, box smallint, due_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.mock_id, c.q_id, c.box, c.due_at from review_cards c
  where c.user_id = auth.uid() and (p_early or c.due_at <= now())
  order by c.due_at, c.mock_id, c.q_id
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------- answering a card ----------
create or replace function public.review_answer(p_mock text, p_q int, p_correct boolean)
returns table (box smallint, due_at timestamptz, mastered boolean)
language plpgsql security definer set search_path = public as $$
declare b smallint;
begin
  select c.box into b from review_cards c
  where c.user_id = auth.uid() and c.mock_id = p_mock and c.q_id = p_q;
  if not found then return; end if;
  if p_correct and b >= 2 then
    delete from review_cards c where c.user_id = auth.uid() and c.mock_id = p_mock and c.q_id = p_q;
    return query select 3::smallint, null::timestamptz, true;
  elsif p_correct then
    update review_cards c set box = b + 1, reviewed_at = now(),
           due_at = now() + case b when 0 then interval '3 days' else interval '7 days' end
    where c.user_id = auth.uid() and c.mock_id = p_mock and c.q_id = p_q;
  else
    update review_cards c set box = 0, reviewed_at = now(), due_at = now() + interval '1 day'
    where c.user_id = auth.uid() and c.mock_id = p_mock and c.q_id = p_q;
  end if;
  return query select c.box, c.due_at, false from review_cards c
    where c.user_id = auth.uid() and c.mock_id = p_mock and c.q_id = p_q;
end $$;

revoke all on function public.deck_summary() from public, anon;
revoke all on function public.deck_cards(boolean, int) from public, anon;
revoke all on function public.review_answer(text, int, boolean) from public, anon;
revoke all on function public.cards_from_attempt() from public, anon, authenticated;
revoke all on function public.cards_from_room() from public, anon, authenticated;
grant execute on function public.deck_summary() to authenticated;
grant execute on function public.deck_cards(boolean, int) to authenticated;
grant execute on function public.review_answer(text, int, boolean) to authenticated;
