-- Prepline stage 13: error log from visitors' browsers (already applied via the Supabase connector)
create table if not exists public.client_errors (
  id bigserial primary key, at timestamptz not null default now(), device text, page text, msg text, src text, ua text,
  user_id uuid default auth.uid());
alter table public.client_errors enable row level security;
-- log_error(p_device, p_page, p_msg, p_src, p_ua): max 20 per device per day, fields truncated
-- admin_errors(): grouped errors of the last 14 days, admins only (admin.html)
