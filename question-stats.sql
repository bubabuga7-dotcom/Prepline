-- Prepline: per-question difficulty for NUET-style weighted scoring.
-- Run once in Supabase → SQL Editor.
-- Exposes only aggregates (how many students tried a question and how many got it wrong),
-- never individual answers. Each student counts once per question: their share of wrong
-- attempts, so retakes do not inflate the numbers.

create or replace view public.question_stats as
select
  mock_id,
  q_id,
  count(*)::int                                   as students,
  round(sum(wrong_share)::numeric, 3)::float8     as wrong
from (
  select user_id, mock_id, q_id,
         1 - avg(case when correct then 1 else 0 end) as wrong_share
  from public.answer_log
  group by user_id, mock_id, q_id
) per_student
group by mock_id, q_id;

grant select on public.question_stats to anon, authenticated;
