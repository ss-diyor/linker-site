-- Fix admin authorization policy recursion
-- Run this once in Supabase SQL Editor.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admin can manage admin users" on public.admin_users;
create policy "Admin can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage now settings" on public.now_settings;
create policy "Admin can manage now settings"
on public.now_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage books" on public.books;
create policy "Admin can manage books"
on public.books
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can manage media" on public.media_items;
create policy "Admin can manage media"
on public.media_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

select public.is_admin() as current_user_is_admin;

-- Expected result after logging in as the admin: true.
-- If run from the SQL Editor without an authenticated browser session,
-- false is expected and does not indicate a problem.
