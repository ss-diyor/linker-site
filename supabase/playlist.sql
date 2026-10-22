-- Run this idempotent migration in Supabase SQL Editor to enable playlist management and cover uploads.
-- Public visitors can only read published tracks; authorized admins can manage all tracks.

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  artist text not null default '',
  links jsonb not null default '{}'::jsonb check (jsonb_typeof(links) = 'object'),
  platform_colors jsonb not null default '{}'::jsonb check (jsonb_typeof(platform_colors) = 'object'),
  cover_url text,
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playlist_tracks
  add column if not exists platform_colors jsonb not null default '{}'::jsonb;

alter table public.playlist_tracks
  add column if not exists cover_url text;

create index if not exists playlist_tracks_public_order_idx
  on public.playlist_tracks (is_published, position, created_at);

alter table public.playlist_tracks enable row level security;

grant select on table public.playlist_tracks to anon, authenticated;
grant insert, update, delete on table public.playlist_tracks to authenticated;

drop policy if exists "Public can read published playlist tracks" on public.playlist_tracks;
create policy "Public can read published playlist tracks"
  on public.playlist_tracks
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins can manage playlist tracks" on public.playlist_tracks;
create policy "Admins can manage playlist tracks"
  on public.playlist_tracks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public may read track covers; only approved admins may upload or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'playlist-covers',
  'playlist-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read playlist covers" on storage.objects;
create policy "Public can read playlist covers"
  on storage.objects for select to public
  using (bucket_id = 'playlist-covers');

drop policy if exists "Admins can upload playlist covers" on storage.objects;
create policy "Admins can upload playlist covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'playlist-covers' and public.is_admin());

drop policy if exists "Admins can update playlist covers" on storage.objects;
create policy "Admins can update playlist covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'playlist-covers' and public.is_admin())
  with check (bucket_id = 'playlist-covers' and public.is_admin());

drop policy if exists "Admins can delete playlist covers" on storage.objects;
create policy "Admins can delete playlist covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'playlist-covers' and public.is_admin());


-- Short text notes shown beneath the playlist tracks.
create table if not exists public.playlist_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null check (length(trim(content)) between 1 and 500),
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlist_notes_public_order_idx
  on public.playlist_notes (is_published, position, created_at);

alter table public.playlist_notes enable row level security;
grant select on table public.playlist_notes to anon, authenticated;
grant insert, update, delete on table public.playlist_notes to authenticated;

drop policy if exists "Public can read published playlist notes" on public.playlist_notes;
create policy "Public can read published playlist notes"
  on public.playlist_notes for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins can manage playlist notes" on public.playlist_notes;
create policy "Admins can manage playlist notes"
  on public.playlist_notes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
