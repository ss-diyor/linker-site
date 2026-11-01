-- Anonymous visitor chat for Linker Site.
-- Before running: enable Anonymous Sign-Ins in Supabase Auth Providers.
-- If Captcha protection is enabled, configure Turnstile secret in Auth > Attack Protection.
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor', 'admin')),
  body text not null check (length(trim(body)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_conversations_visitor_idx on public.chat_conversations(visitor_id, updated_at desc);
create index if not exists chat_conversations_status_idx on public.chat_conversations(status, updated_at desc);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
revoke all on table public.chat_conversations, public.chat_messages from anon, authenticated;
grant select, insert, update, delete on table public.chat_conversations to authenticated;
grant select, insert, delete on table public.chat_messages to authenticated;

-- SECURITY DEFINER helpers avoid recursive RLS policy evaluation while retaining rate limits.
create or replace function public.can_create_chat_conversation(p_visitor_id uuid)
returns boolean language sql security definer set search_path = public
as $$
  select p_visitor_id = auth.uid()
    and (select count(*) from public.chat_conversations c
         where c.visitor_id = p_visitor_id and c.created_at > now() - interval '24 hours') < 3;
$$;

create or replace function public.can_send_chat_message(p_conversation_id uuid)
returns boolean language sql security definer set search_path = public
as $$
  select (select count(*) from public.chat_messages m
          where m.conversation_id = p_conversation_id
            and m.sender_type = 'visitor'
            and m.created_at > now() - interval '1 minute') < 8;
$$;

revoke all on function public.can_create_chat_conversation(uuid) from public;
revoke all on function public.can_send_chat_message(uuid) from public;
grant execute on function public.can_create_chat_conversation(uuid) to authenticated;
grant execute on function public.can_send_chat_message(uuid) to authenticated;

drop policy if exists "Visitors can read own conversations" on public.chat_conversations;
create policy "Visitors can read own conversations" on public.chat_conversations for select to authenticated
using (visitor_id = auth.uid() or public.is_admin());

drop policy if exists "Visitors can create own conversations" on public.chat_conversations;
create policy "Visitors can create own conversations" on public.chat_conversations for insert to authenticated
with check (visitor_id = auth.uid() and public.can_create_chat_conversation(visitor_id));

drop policy if exists "Visitors and admins can update conversations" on public.chat_conversations;
create policy "Visitors and admins can update conversations" on public.chat_conversations for update to authenticated
using (visitor_id = auth.uid() or public.is_admin())
with check (visitor_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can delete chat data" on public.chat_conversations;
create policy "Admins can delete chat data" on public.chat_conversations for delete to authenticated
using (public.is_admin());

drop policy if exists "Visitors can read own messages" on public.chat_messages;
create policy "Visitors can read own messages" on public.chat_messages for select to authenticated
using (public.is_admin() or exists (
  select 1 from public.chat_conversations c where c.id = conversation_id and c.visitor_id = auth.uid()
));

drop policy if exists "Visitors can send own messages" on public.chat_messages;
create policy "Visitors can send own messages" on public.chat_messages for insert to authenticated
with check (sender_type = 'visitor' and exists (
  select 1 from public.chat_conversations c where c.id = conversation_id and c.visitor_id = auth.uid() and c.status = 'active'
) and public.can_send_chat_message(conversation_id));

drop policy if exists "Admins can send replies" on public.chat_messages;
create policy "Admins can send replies" on public.chat_messages for insert to authenticated
with check (sender_type = 'admin' and public.is_admin());

drop policy if exists "Admins can delete chat messages" on public.chat_messages;
create policy "Admins can delete chat messages" on public.chat_messages for delete to authenticated
using (public.is_admin());

create or replace function public.touch_chat_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists chat_messages_touch_conversation on public.chat_messages;
create trigger chat_messages_touch_conversation after insert on public.chat_messages
for each row execute function public.touch_chat_conversation();

-- Safe to run repeatedly: do not add tables already present in supabase_realtime.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_conversations') then
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
