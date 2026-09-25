-- A cap on the address, and the short tag of the link a signup came from (riangeng.com/?ref=x).
-- The server sends source only when the link had a valid tag.

alter table public.waitlist
  add constraint waitlist_email_length check (char_length(email) <= 254);

alter table public.waitlist
  add column source text;

alter table public.waitlist
  add constraint waitlist_source_length check (char_length(source) <= 32);
