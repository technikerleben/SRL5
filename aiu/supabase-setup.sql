-- Aufbruch ins Unbekannte: gemeinsame Daten für mehrere Geräte
-- Dieses Skript einmal im Supabase SQL Editor ausführen.

create table if not exists public.aiu_state (
  class_code text primary key,
  runtime jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.aiu_submissions (
  id uuid primary key,
  class_code text not null,
  week integer not null,
  mission_id text,
  mission_title text not null,
  area text,
  resource text,
  author text,
  text text,
  type text not null default 'text',
  mime text,
  media_path text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists aiu_submissions_class_week_idx
  on public.aiu_submissions(class_code, week, created_at desc);

create table if not exists public.aiu_votes (
  id uuid primary key,
  class_code text not null,
  week integer not null,
  choice integer not null,
  device_id text,
  created_at timestamptz not null default now()
);

create index if not exists aiu_votes_class_week_idx
  on public.aiu_votes(class_code, week);

alter table public.aiu_state enable row level security;
alter table public.aiu_submissions enable row level security;
alter table public.aiu_votes enable row level security;

-- Für diese schulische Klassen-App darf der anonyme Webclient lesen und schreiben.
-- Der class_code trennt verschiedene Klassen logisch, ist aber kein geheimer Zugangsschutz.
drop policy if exists "aiu state public access" on public.aiu_state;
create policy "aiu state public access" on public.aiu_state
  for all to anon using (true) with check (true);

drop policy if exists "aiu submissions public access" on public.aiu_submissions;
create policy "aiu submissions public access" on public.aiu_submissions
  for all to anon using (true) with check (true);

drop policy if exists "aiu votes public access" on public.aiu_votes;
create policy "aiu votes public access" on public.aiu_votes
  for all to anon using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('aiu-media', 'aiu-media', true)
on conflict (id) do update set public = true;

-- Storage-Richtlinien
-- Bereits vorhandene Policies mit gleichen Namen werden vorher entfernt.
drop policy if exists "aiu media public read" on storage.objects;
create policy "aiu media public read" on storage.objects
  for select to public using (bucket_id = 'aiu-media');

drop policy if exists "aiu media anon insert" on storage.objects;
create policy "aiu media anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'aiu-media');

drop policy if exists "aiu media anon update" on storage.objects;
create policy "aiu media anon update" on storage.objects
  for update to anon using (bucket_id = 'aiu-media') with check (bucket_id = 'aiu-media');

drop policy if exists "aiu media anon delete" on storage.objects;
create policy "aiu media anon delete" on storage.objects
  for delete to anon using (bucket_id = 'aiu-media');
