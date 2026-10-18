-- Add optional custom vertical-line color for the About page quote.
alter table public.about_content
  add column if not exists quote_color text not null default '';
