-- Public, Discord-style chat servers for Linker Site.
-- Requires the existing public.is_admin() helper and Supabase anonymous sign-in.

create table if not exists public.chat_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  description text not null default '' check (length(description) <= 240),
  color text not null default '#A8A5FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_published boolean not null default false,
  is_locked boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_server_messages (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.chat_servers(id) on delete cascade,
  visitor_id uuid not null references auth.users(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor', 'admin')),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_servers_visible_order_idx
  on public.chat_servers(is_published, position, created_at);
create index if not exists chat_server_messages_room_time_idx
  on public.chat_server_messages(server_id, created_at);
create index if not exists chat_server_messages_user_time_idx
  on public.chat_server_messages(visitor_id, created_at desc);

alter table public.chat_servers enable row level security;
alter table public.chat_server_messages enable row level security;
revoke all on public.chat_servers, public.chat_server_messages from anon, authenticated;
grant select on public.chat_servers to anon, authenticated;
grant insert, update, delete on public.chat_servers to authenticated;
grant select, insert, delete on public.chat_server_messages to authenticated;

drop policy if exists "Published chat servers are public" on public.chat_servers;
create policy "Published chat servers are public" on public.chat_servers for select to anon, authenticated
using (is_published);

drop policy if exists "Admins manage chat servers" on public.chat_servers;
create policy "Admins manage chat servers" on public.chat_servers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.can_send_server_chat_message(p_server_id uuid, p_visitor_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare recent_count bigint;
begin
  if p_visitor_id is null or p_visitor_id is distinct from auth.uid() then return false; end if;
  if not exists (select 1 from public.chat_servers s where s.id = p_server_id and s.is_published and not s.is_locked) then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visitor_id::text || ':' || p_server_id::text, 0));
  select count(*) into recent_count from public.chat_server_messages m
    where m.server_id = p_server_id and m.visitor_id = p_visitor_id and m.sender_type = 'visitor'
    and m.created_at > now() - interval '1 minute';
  return recent_count < 10;
end;
$$;
revoke all on function public.can_send_server_chat_message(uuid, uuid) from public;
grant execute on function public.can_send_server_chat_message(uuid, uuid) to authenticated;

drop policy if exists "Members read published server messages" on public.chat_server_messages;
create policy "Members read published server messages" on public.chat_server_messages for select to authenticated
using (public.is_admin() or exists (
  select 1 from public.chat_servers s where s.id = server_id and s.is_published
));

drop policy if exists "Visitors send to open published servers" on public.chat_server_messages;
create policy "Visitors send to open published servers" on public.chat_server_messages for insert to authenticated
with check (
  sender_type = 'visitor'
  and visitor_id = auth.uid()
  and public.can_send_server_chat_message(server_id, visitor_id)
);

drop policy if exists "Admins send server messages" on public.chat_server_messages;
create policy "Admins send server messages" on public.chat_server_messages for insert to authenticated
with check (sender_type = 'admin' and visitor_id = auth.uid() and public.is_admin());

drop policy if exists "Admins delete server messages" on public.chat_server_messages;
create policy "Admins delete server messages" on public.chat_server_messages for delete to authenticated
using (public.is_admin());

create or replace function public.touch_chat_server_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists chat_servers_touch_updated_at on public.chat_servers;
create trigger chat_servers_touch_updated_at before update on public.chat_servers
for each row execute function public.touch_chat_server_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_servers') then
    alter publication supabase_realtime add table public.chat_servers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_server_messages') then
    alter publication supabase_realtime add table public.chat_server_messages;
  end if;
end $$;
