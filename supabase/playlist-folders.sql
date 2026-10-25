-- Add Google Drive-style folders to the existing playlist system.
create table if not exists public.playlist_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  color text not null default '#a8a5ff' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  cover_url text,
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playlist_tracks add column if not exists folder_id uuid references public.playlist_folders(id) on delete set null;
create index if not exists playlist_folders_public_order_idx on public.playlist_folders (is_published, position, created_at);
create index if not exists playlist_tracks_folder_order_idx on public.playlist_tracks (folder_id, position, created_at);
alter table public.playlist_folders enable row level security;
grant select on table public.playlist_folders to anon, authenticated;
grant insert, update, delete on table public.playlist_folders to authenticated;
drop policy if exists "Public can read published playlist folders" on public.playlist_folders;
create policy "Public can read published playlist folders" on public.playlist_folders for select to anon, authenticated using (is_published = true);
drop policy if exists "Admins can manage playlist folders" on public.playlist_folders;
create policy "Admins can manage playlist folders" on public.playlist_folders for all to authenticated using (public.is_admin()) with check (public.is_admin());
