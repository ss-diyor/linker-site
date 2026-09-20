-- Add book cover URLs to existing Linker Site databases.
alter table public.books add column if not exists cover_url text;
