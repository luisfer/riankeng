-- The rest of the link a sign-up came from: the utm_ tags that ad platforms and link builders add,
-- the site that linked here, and the page the visit arrived on. The server sends each one only when
-- it passed the checks in src/attribution.ts, and saves the address without them if this
-- migration has not run yet.

alter table public.waitlist
  add column utm_source text check (char_length(utm_source) <= 64),
  add column utm_medium text check (char_length(utm_medium) <= 64),
  add column utm_campaign text check (char_length(utm_campaign) <= 64),
  add column utm_content text check (char_length(utm_content) <= 64),
  add column utm_term text check (char_length(utm_term) <= 64),
  add column referrer text check (char_length(referrer) <= 128),
  add column landing text check (char_length(landing) <= 64);
