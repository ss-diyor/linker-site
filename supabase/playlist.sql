-- Run this script once in Supabase SQL Editor to enable playlist management.
-- Public visitors can only read published tracks; authorized admins can manage all tracks.

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  artist text not null default '',
  links jsonb not null default '{}'::jsonb check (jsonb_typeof(links) = 'object'),
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
