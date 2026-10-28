-- Prepline stage 15: answers the student was not sure about go to the mistakes deck too.
-- A right answer marked "Not sure" or "Guessed" on the test page becomes a card, like a wrong one.
-- Students can only add cards for themselves; scores and attempts are not touched.

create or replace function public.deck_add(p_mock text, p_ids int[])
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null or p_mock is null or p_mock !~ '^(mix|crit|test)[-0-9]*$' then return 0; end if;
  insert into review_cards (user_id, mock_id, q_id, box, due_at)
  select auth.uid(), p_mock, x, 0, now() + interval '1 day'
  from unnest(p_ids[1:40]) as x
  where x between 1 and 32767
  on conflict (user_id, mock_id, q_id) do update set box = 0, due_at = excluded.due_at;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.deck_add(text, int[]) from public, anon;
grant execute on function public.deck_add(text, int[]) to authenticated;
