-- Apply after supabase/chat.sql on an existing deployment.
-- Safe to run repeatedly. Restricts conversation status changes to admins,
-- enables admin-only is_read updates, and serializes rate-limit checks.
begin;

-- Visitors do not need to update their conversation rows. Admins retain update access.
drop policy if exists "Visitors and admins can update conversations" on public.chat_conversations;
drop policy if exists "Admins can update conversations" on public.chat_conversations;
create policy "Admins can update conversations"
on public.chat_conversations for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Grant only the read marker column; RLS still restricts these updates to admins.
grant update (is_read) on table public.chat_messages to authenticated;
drop policy if exists "Admins can mark chat messages read" on public.chat_messages;
create policy "Admins can mark chat messages read"
on public.chat_messages for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Transaction-scoped advisory locks make concurrent inserts obey the same limits.
create or replace function public.can_create_chat_conversation(p_visitor_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  conversation_count bigint;
begin
  if p_visitor_id is null or p_visitor_id is distinct from auth.uid() then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_visitor_id::text, 0)
  );

  select count(*) into conversation_count
  from public.chat_conversations c
  where c.visitor_id = p_visitor_id
    and c.created_at > now() - interval '24 hours';

  return conversation_count < 3;
end;
$$;

create or replace function public.can_send_chat_message(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  visitor_message_count bigint;
begin
  if p_conversation_id is null or not exists (
    select 1
    from public.chat_conversations c
    where c.id = p_conversation_id
      and c.visitor_id = auth.uid()
  ) then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_conversation_id::text, 0)
  );

  select count(*) into visitor_message_count
  from public.chat_messages m
  where m.conversation_id = p_conversation_id
    and m.sender_type = 'visitor'
    and m.created_at > now() - interval '1 minute';

  return visitor_message_count < 8;
end;
$$;

revoke all on function public.can_create_chat_conversation(uuid) from public;
revoke all on function public.can_send_chat_message(uuid) from public;
grant execute on function public.can_create_chat_conversation(uuid) to authenticated;
grant execute on function public.can_send_chat_message(uuid) to authenticated;

commit;
