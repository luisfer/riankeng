-- Waitlist addresses. The browser never reads or writes this table.
-- Inserts go through the service role on the server.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_email_lowercase check (email = lower(email))
);

create unique index waitlist_email_key on public.waitlist (email);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from public, anon, authenticated;
grant all on table public.waitlist to service_role;
