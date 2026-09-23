-- One progress document per signed-in learner.
-- The browser writes it with that learner's JWT. The service role is not involved.

create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

revoke all on table public.progress from public, anon;
grant select, insert, update on table public.progress to authenticated;
grant all on table public.progress to service_role;

create policy progress_select on public.progress
  for select to authenticated
  using (auth.uid() = user_id);

create policy progress_insert on public.progress
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy progress_update on public.progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
