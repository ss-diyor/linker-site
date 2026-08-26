-- Linker Site: /now content and admin access
-- Run this in Supabase SQL Editor after creating the first Auth user.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.now_settings (
  id text primary key default 'default',
  focus_title text not null default 'Xorijiy til va adabiyoti: ingliz tili',
  focus_subtitle text not null default 'web development · AI · design',
  last_updated date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  year integer,
  status text not null default 'reading' check (status in ('reading', 'paused', 'finished')),
  external_url text,
  note text not null default '',
  started_on date,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'movie' check (type in ('movie', 'series', 'animation', 'documentary', 'anime', 'other')),
  status text not null default 'watched' check (status in ('watched', 'watching', 'watchlist')),
  year integer,
  external_url text,
  rating numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  note text not null default '',
  watched_on date,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.now_settings (id)
values ('default')
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.now_settings enable row level security;
alter table public.books enable row level security;
alter table public.media_items enable row level security;

revoke all on table public.admin_users, public.now_settings, public.books, public.media_items from anon, authenticated;
grant select on table public.now_settings, public.books, public.media_items to anon, authenticated;
grant select, insert, update, delete on table public.admin_users, public.now_settings, public.books, public.media_items to authenticated;

drop policy if exists "Public can read now settings" on public.now_settings;
create policy "Public can read now settings"
on public.now_settings for select
to anon, authenticated
using (true);

drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
on public.books for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Public can read published media" on public.media_items;
create policy "Public can read published media"
on public.media_items for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admin can manage admin users" on public.admin_users;
create policy "Admin can manage admin users"
on public.admin_users for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage now settings" on public.now_settings;
create policy "Admin can manage now settings"
on public.now_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage books" on public.books;
create policy "Admin can manage books"
on public.books for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage media" on public.media_items;
create policy "Admin can manage media"
on public.media_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.touch_now_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_table_name = 'books' or tg_table_name = 'media_items' then
    update public.now_settings set last_updated = current_date, updated_at = now() where id = 'default';
  end if;
  return new;
end;
$$;

drop trigger if exists now_settings_touch on public.now_settings;
create trigger now_settings_touch before update on public.now_settings for each row execute function public.touch_now_updated_at();
drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books for each row execute function public.touch_now_updated_at();
drop trigger if exists media_touch on public.media_items;
create trigger media_touch before update on public.media_items for each row execute function public.touch_now_updated_at();
