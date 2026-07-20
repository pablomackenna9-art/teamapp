-- ============================================================
-- TeamApp - Leagues: the super admin groups clubs into leagues
-- so "Todos los equipos" and cross-club rankings can be split
-- by league. Any authenticated user can read the league list
-- (needed for the "new team" picker); only the platform super
-- admin can create new ones.
-- ============================================================

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

alter table public.leagues enable row level security;

drop policy if exists "leagues_select" on public.leagues;
create policy "leagues_select" on public.leagues for select using (auth.uid() is not null);

drop policy if exists "leagues_insert" on public.leagues;
create policy "leagues_insert" on public.leagues for insert with check (is_platform_admin());

insert into public.leagues (name) values
  ('Liga San José'),
  ('Liga Club Chicureo Norte'),
  ('Liga LIF'),
  ('Liga Oriente')
on conflict (name) do nothing;

alter table public.teams add column if not exists league_id uuid references public.leagues on delete set null;
