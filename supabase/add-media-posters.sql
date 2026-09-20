-- Add poster URLs to existing Linker Site databases.
alter table public.media_items add column if not exists poster_url text;
