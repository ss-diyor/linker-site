-- Linker Site: admin-managed homepage timeline
-- Run this once in the Supabase SQL Editor.

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 1900 and year <= 2200),
  month integer check (month is null or (month >= 1 and month <= 12)),
  title text not null,
  description text not null default '',
  position integer not null default 0,
  is_current boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.timeline_events enable row level security;

revoke all on table public.timeline_events from anon, authenticated;
grant select on table public.timeline_events to anon, authenticated;
grant select, insert, update, delete on table public.timeline_events to authenticated;

drop policy if exists "Public can read published timeline" on public.timeline_events;
create policy "Public can read published timeline"
on public.timeline_events for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admin can manage timeline" on public.timeline_events;
create policy "Admin can manage timeline"
on public.timeline_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.touch_timeline_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists timeline_events_touch on public.timeline_events;
create trigger timeline_events_touch
before update on public.timeline_events
for each row execute function public.touch_timeline_updated_at();

-- Import the current hard-coded timeline once. ON CONFLICT prevents duplicates
-- if this migration is run more than once after the table already contains data.
insert into public.timeline_events (year, month, title, description, position, is_current)
select * from (values
  (2015, null, 'Maktabga qabul', 'Umumiy o‘rta ta’lim maktabida 7 yil davomida tahsil oldim.', 0, false),
  (2022, null, 'Ixtisoslashtirilgan maktabga qabul', 'Bo‘stonliq tumani ixtisoslashtirilgan maktabida yangi bosqichni boshladim.', 1, false),
  (2023, null, 'IELTS imtihoni', 'Ustozlarimdan o‘rganganlarim asosida IELTS imtihonini muvaffaqiyatli topshirdim.', 2, false),
  (2024, null, 'Akademik o‘sish', 'Akademik taraflama sezilarli o‘sib, bilim va ko‘nikmalarimni chuqurlashtirdim.', 3, false),
  (2025, null, 'Sertifikatlar va dizayn', 'Milliy sertifikat imtihonlarini topshirdim va grafik dizayn bilan qiziqa boshladim.', 4, false),
  (2026, null, 'Bitiruvchi va yangi bilimlar', 'Maktabni tamomladim. Dasturlash, grafik dizayn va AI sohasida yangi narsalarni o‘rgandim.', 5, false),
  (2026, null, 'CSPU, Class of ’30', 'Chirchiq davlat pedagogika universitetining 1-kurs talabasiman.', 6, true)
) as seed(year, month, title, description, position, is_current)
where not exists (select 1 from public.timeline_events);
