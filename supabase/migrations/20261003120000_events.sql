-- What visitors do on the landing card and the preview, counted. Never an address.
-- The browser never reads or writes this table. Inserts go through the service role on the server
-- (api/event.ts, src/event-log.ts), which checks every field first. These checks are the second line.

create table public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- The visitor's own calendar day, so a return the next morning counts wherever they are.
  day date not null,
  name text not null check (name in ('view', 'check', 'hear', 'cta', 'join', 'done', 'consent', 'price_click', 'error')),
  page text not null check (page in ('landing', 'preview', 'course')),
  -- One page load. Never stored in the browser.
  visit uuid not null,
  -- The browser's random number. Only when the visitor allowed counting; otherwise null.
  device uuid,
  card text check (char_length(card) <= 64),
  detail text check (detail ~ '^[a-z0-9_.-]{1,24}$'),
  -- On a missed card only: what was typed, romanization letters and marks only.
  typed text check (char_length(typed) <= 60),
  ref text check (ref ~ '^[a-z0-9_-]{1,32}$'),
  utm_source text check (char_length(utm_source) <= 64),
  utm_medium text check (char_length(utm_medium) <= 64),
  utm_campaign text check (char_length(utm_campaign) <= 64),
  utm_content text check (char_length(utm_content) <= 64),
  utm_term text check (char_length(utm_term) <= 64),
  referrer text check (char_length(referrer) <= 128),
  landing text check (char_length(landing) <= 64)
);

create index events_name_day on public.events (name, day);
create index events_device_day on public.events (device, day) where device is not null;
create index events_ref on public.events (ref) where ref is not null;

alter table public.events enable row level security;

revoke all on table public.events from public, anon, authenticated;
grant all on table public.events to service_role;

-- Counting data is kept 13 months (privacy.html). Run monthly, for example from the SQL editor:
--   delete from public.events where at < now() - interval '13 months';
