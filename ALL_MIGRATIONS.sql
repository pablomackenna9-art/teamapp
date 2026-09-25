-- ============================================================
-- TeamApp - Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles (extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#22c55e',
  secondary_color text not null default '#15803d',
  sport text not null default 'football',
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

-- Team members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'captain', 'player')) default 'player',
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

-- Seasons
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean default true
);

-- Categories (branches: Junior, Senior, Femenino, etc.)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  name text not null
);

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  user_id uuid references auth.users,
  name text not null,
  photo_url text,
  position text,
  number int,
  category_id uuid references public.categories,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  season_id uuid references public.seasons,
  category_id uuid references public.categories,
  rival text not null,
  date timestamptz not null,
  location text,
  type text not null check (type in ('official', 'friendly')) default 'official',
  status text not null check (status in ('upcoming', 'played', 'suspended')) default 'upcoming',
  home_score int,
  away_score int,
  summary text,
  cover_photo_url text,
  created_at timestamptz default now()
);

-- Match events (goals, assists, cards, mvp votes)
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  type text not null check (type in ('goal', 'assist', 'yellow_card', 'red_card', 'mvp_vote')),
  minute int,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  -- Each player can only vote MVP once per match
  unique nulls not distinct (match_id, player_id, type)
);

-- Match attendance
create table if not exists public.match_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  status text not null check (status in ('confirmed', 'absent', 'maybe', 'no_response')) default 'no_response',
  updated_at timestamptz default now(),
  unique (match_id, player_id)
);

-- Standings rivals
create table if not exists public.standings_rivals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  season_id uuid references public.seasons,
  rival_name text not null,
  played int default 0,
  won int default 0,
  drawn int default 0,
  lost int default 0,
  goals_for int default 0,
  goals_against int default 0,
  points int generated always as (won * 3 + drawn) stored
);

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  match_id uuid references public.matches on delete set null,
  url text not null,
  caption text,
  uploaded_by uuid references auth.users not null,
  created_at timestamptz default now()
);

-- Posts / News
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  title text not null,
  content text not null,
  type text not null check (type in ('notice', 'citation', 'announcement')) default 'notice',
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.seasons enable row level security;
alter table public.categories enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.match_attendance enable row level security;
alter table public.standings_rivals enable row level security;
alter table public.photos enable row level security;
alter table public.posts enable row level security;

-- Helper function: check if user is member of a team
create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- Helper function: check if user is admin or captain
create or replace function public.is_team_admin(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role in ('admin', 'captain')
  );
$$;

-- Profiles: users can read/update their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Teams: members can read, admins can update
create policy "teams_select" on public.teams for select using (is_team_member(id));
create policy "teams_insert" on public.teams for insert with check (auth.uid() = created_by);
create policy "teams_update" on public.teams for update using (is_team_admin(id));

-- Team members
create policy "team_members_select" on public.team_members for select using (is_team_member(team_id));
create policy "team_members_insert" on public.team_members for insert with check (
  is_team_admin(team_id) or auth.uid() = (select created_by from public.teams where id = team_id limit 1)
);
create policy "team_members_delete" on public.team_members for delete using (is_team_admin(team_id));

-- Generic member-read / admin-write policies
do $$ declare tbl text; begin
  foreach tbl in array array['seasons','categories','players','matches','standings_rivals','photos','posts'] loop
    execute format('create policy "%s_select" on public.%s for select using (is_team_member(team_id))', tbl, tbl);
    execute format('create policy "%s_insert" on public.%s for insert with check (is_team_admin(team_id))', tbl, tbl);
    execute format('create policy "%s_update" on public.%s for update using (is_team_admin(team_id))', tbl, tbl);
    execute format('create policy "%s_delete" on public.%s for delete using (is_team_admin(team_id))', tbl, tbl);
  end loop;
end $$;

-- Match events: members read, admins insert/delete, players can vote MVP
create policy "match_events_select" on public.match_events for select using (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_events_insert" on public.match_events for insert with check (
  is_team_member((select team_id from public.matches where id = match_id))
  and (
    is_team_admin((select team_id from public.matches where id = match_id))
    or (type = 'mvp_vote' and created_by = auth.uid())
  )
);
create policy "match_events_delete" on public.match_events for delete using (
  is_team_admin((select team_id from public.matches where id = match_id))
);

-- Match attendance: members read, players update their own
create policy "match_attendance_select" on public.match_attendance for select using (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_attendance_upsert" on public.match_attendance for insert with check (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_attendance_update" on public.match_attendance for update using (
  is_team_member((select team_id from public.matches where id = match_id))
);

-- ============================================================
-- Supabase Storage bucket for photos
-- ============================================================
-- Run in Supabase dashboard > Storage:
-- 1. Create bucket "team-photos" (public: true)
-- 2. Add policy: authenticated users can upload to their team folder
-- Or run via SQL:
insert into storage.buckets (id, name, public) values ('team-photos', 'team-photos', true)
  on conflict (id) do nothing;
-- ============================================================
-- TeamApp - Fixture, configurable points, DT role, lineups
-- ============================================================

-- Allow 'dt' role (director técnico) alongside admin/captain/player
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'captain', 'player', 'dt'));

-- Configurable points-per-win, per category (2 or 3)
alter table public.categories add column if not exists points_per_win int not null default 3
  check (points_per_win in (2, 3));

-- Full fixture per category: round-by-round schedule + results
create table if not exists public.fixture_matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  round int not null,
  home_team text not null,
  away_team text not null,
  date timestamptz not null,
  home_score int,
  away_score int,
  played boolean not null default false,
  created_at timestamptz default now()
);

alter table public.fixture_matches enable row level security;

create policy "fixture_matches_select" on public.fixture_matches for select using (is_team_member(team_id));
create policy "fixture_matches_insert" on public.fixture_matches for insert with check (is_team_admin(team_id));
create policy "fixture_matches_update" on public.fixture_matches for update using (is_team_admin(team_id));
create policy "fixture_matches_delete" on public.fixture_matches for delete using (is_team_admin(team_id));

-- Lineups / formations per match (admin or DT sets these)
alter table public.matches add column if not exists formation text;
alter table public.matches add column if not exists lineup jsonb not null default '{}'::jsonb;

-- Standings are now computed client-side from fixture_matches + categories.points_per_win,
-- so standings_rivals becomes optional/legacy. Keep table for backward compatibility.

-- View: computed standings per category (played matches only)
create or replace view public.category_standings as
with results as (
  select
    fm.category_id,
    fm.home_team as team_name,
    fm.home_score as gf,
    fm.away_score as gc,
    case when fm.home_score > fm.away_score then 'W'
         when fm.home_score < fm.away_score then 'L'
         else 'D' end as outcome
  from public.fixture_matches fm
  where fm.played and fm.home_score is not null and fm.away_score is not null
  union all
  select
    fm.category_id,
    fm.away_team as team_name,
    fm.away_score as gf,
    fm.home_score as gc,
    case when fm.away_score > fm.home_score then 'W'
         when fm.away_score < fm.home_score then 'L'
         else 'D' end as outcome
  from public.fixture_matches fm
  where fm.played and fm.home_score is not null and fm.away_score is not null
)
select
  r.category_id,
  c.points_per_win,
  r.team_name,
  count(*) as played,
  count(*) filter (where outcome = 'W') as won,
  count(*) filter (where outcome = 'D') as drawn,
  count(*) filter (where outcome = 'L') as lost,
  sum(r.gf) as goals_for,
  sum(r.gc) as goals_against,
  sum(r.gf) - sum(r.gc) as goal_diff,
  (count(*) filter (where outcome = 'W') * c.points_per_win) + count(*) filter (where outcome = 'D') as points
from results r
join public.categories c on c.id = r.category_id
group by r.category_id, c.points_per_win, r.team_name;
-- ============================================================
-- TeamApp - Fix / re-apply RLS policies safely (idempotent)
-- Run this in Supabase SQL Editor if teams/team_members
-- inserts are failing with "row violates row-level security policy"
-- ============================================================

-- Make sure helper functions exist
create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role in ('admin', 'captain', 'dt')
  );
$$;

-- Re-create profiles policies
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Re-create teams policies
drop policy if exists "teams_select" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
create policy "teams_select" on public.teams for select using (is_team_member(id));
create policy "teams_insert" on public.teams for insert with check (auth.uid() = created_by);
create policy "teams_update" on public.teams for update using (is_team_admin(id));

-- Re-create team_members policies
drop policy if exists "team_members_select" on public.team_members;
drop policy if exists "team_members_insert" on public.team_members;
drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_select" on public.team_members for select using (is_team_member(team_id));
create policy "team_members_insert" on public.team_members for insert with check (
  is_team_admin(team_id) or auth.uid() = (select created_by from public.teams where id = team_id limit 1)
);
create policy "team_members_delete" on public.team_members for delete using (is_team_admin(team_id));

-- Re-create generic member-read / admin-write policies
do $$ declare tbl text; begin
  foreach tbl in array array['seasons','categories','players','matches','standings_rivals','photos','posts','fixture_matches'] loop
    execute format('drop policy if exists "%s_select" on public.%s', tbl, tbl);
    execute format('drop policy if exists "%s_insert" on public.%s', tbl, tbl);
    execute format('drop policy if exists "%s_update" on public.%s', tbl, tbl);
    execute format('drop policy if exists "%s_delete" on public.%s', tbl, tbl);
    execute format('create policy "%s_select" on public.%s for select using (is_team_member(team_id))', tbl, tbl);
    execute format('create policy "%s_insert" on public.%s for insert with check (is_team_admin(team_id))', tbl, tbl);
    execute format('create policy "%s_update" on public.%s for update using (is_team_admin(team_id))', tbl, tbl);
    execute format('create policy "%s_delete" on public.%s for delete using (is_team_admin(team_id))', tbl, tbl);
  end loop;
end $$;

-- Re-create match_events / match_attendance policies
drop policy if exists "match_events_select" on public.match_events;
drop policy if exists "match_events_insert" on public.match_events;
drop policy if exists "match_events_delete" on public.match_events;
create policy "match_events_select" on public.match_events for select using (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_events_insert" on public.match_events for insert with check (
  is_team_member((select team_id from public.matches where id = match_id))
  and (
    is_team_admin((select team_id from public.matches where id = match_id))
    or (type = 'mvp_vote' and created_by = auth.uid())
  )
);
create policy "match_events_delete" on public.match_events for delete using (
  is_team_admin((select team_id from public.matches where id = match_id))
);

drop policy if exists "match_attendance_select" on public.match_attendance;
drop policy if exists "match_attendance_upsert" on public.match_attendance;
drop policy if exists "match_attendance_update" on public.match_attendance;
create policy "match_attendance_select" on public.match_attendance for select using (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_attendance_upsert" on public.match_attendance for insert with check (
  is_team_member((select team_id from public.matches where id = match_id))
);
create policy "match_attendance_update" on public.match_attendance for update using (
  is_team_member((select team_id from public.matches where id = match_id))
);
-- ============================================================
-- TeamApp - Fix "chicken-and-egg" bug when creating a new team
-- Problem: a user can INSERT a team, but the immediate SELECT-back
-- (used by `.select().single()` in the app, and by any client using
-- return=representation) requires is_team_member(id), which is false
-- until the team_members row is created right after. This blocked
-- ALL new team creation.
-- Fix: also allow the creator to see their own just-created team.
-- ============================================================

drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams for select using (
  is_team_member(id) or created_by = auth.uid()
);
-- ============================================================
-- TeamApp - Platform super-admin + "coordinador" per-club role
-- ============================================================

-- Platform admins: users who can see/manage ALL teams (the app owner)
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.platform_admins enable row level security;

-- Anyone can check if THEY are an admin; existing admins can see the full list
drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select" on public.platform_admins for select using (
  user_id = auth.uid()
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

-- Bootstrap pattern: if the table is empty, anyone can make themselves the
-- first admin. After that, only existing admins can add new ones.
drop policy if exists "platform_admins_insert" on public.platform_admins;
create policy "platform_admins_insert" on public.platform_admins for insert with check (
  not exists (select 1 from public.platform_admins)
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

drop policy if exists "platform_admins_delete" on public.platform_admins;
create policy "platform_admins_delete" on public.platform_admins for delete using (
  exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

-- Helper function
create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Allow 'coordinador' as a per-club role (same privileges as 'admin' for that club)
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'captain', 'player', 'dt', 'coordinador'));

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
      and role in ('admin', 'captain', 'dt', 'coordinador')
  ) or public.is_platform_admin();
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

-- Teams: platform admin can see + manage every team
drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams for select using (
  is_team_member(id) or created_by = auth.uid() or is_platform_admin()
);

drop policy if exists "teams_update" on public.teams;
create policy "teams_update" on public.teams for update using (
  is_team_admin(id) or is_platform_admin()
);

-- Team members: platform admin can see/manage every team's roster
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members for select using (
  is_team_member(team_id) or is_platform_admin()
);

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members for insert with check (
  is_team_admin(team_id)
  or auth.uid() = (select created_by from public.teams where id = team_id limit 1)
  or is_platform_admin()
);

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members for delete using (
  is_team_admin(team_id) or is_platform_admin()
);

-- RPC: platform admin adds/updates a "coordinador" for a team by email
-- (SECURITY DEFINER so it can look up auth.users by email safely)
create or replace function public.admin_set_team_coordinador(p_team_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede asignar coordinadores';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'No existe un usuario registrado con el email %', p_email;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, 'coordinador')
  on conflict (team_id, user_id) do update set role = 'coordinador';
end;
$$;
-- ============================================================
-- TeamApp - MVP voting with identified voter + closeable by coordinador
-- ============================================================

-- Whether the coordinador/admin has closed MVP voting for a match
alter table public.matches add column if not exists mvp_voting_closed boolean not null default false;

-- One editable vote per voter per match (upsert pattern), visible to teammates
create table if not exists public.mvp_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade not null,
  voter_id uuid references auth.users on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  updated_at timestamptz default now(),
  unique (match_id, voter_id)
);

alter table public.mvp_votes enable row level security;

drop policy if exists "mvp_votes_select" on public.mvp_votes;
create policy "mvp_votes_select" on public.mvp_votes for select using (
  is_team_member((select team_id from public.matches where id = match_id))
);

drop policy if exists "mvp_votes_insert" on public.mvp_votes;
create policy "mvp_votes_insert" on public.mvp_votes for insert with check (
  voter_id = auth.uid()
  and is_team_member((select team_id from public.matches where id = match_id))
  and (
    is_team_admin((select team_id from public.matches where id = match_id))
    or not coalesce((select mvp_voting_closed from public.matches where id = match_id), false)
  )
);

drop policy if exists "mvp_votes_update" on public.mvp_votes;
create policy "mvp_votes_update" on public.mvp_votes for update using (
  voter_id = auth.uid()
  and (
    is_team_admin((select team_id from public.matches where id = match_id))
    or not coalesce((select mvp_voting_closed from public.matches where id = match_id), false)
  )
);

drop policy if exists "mvp_votes_delete" on public.mvp_votes;
create policy "mvp_votes_delete" on public.mvp_votes for delete using (
  voter_id = auth.uid()
  or is_team_admin((select team_id from public.matches where id = match_id))
);
-- ============================================================
-- TeamApp - Storage RLS for the "team-photos" bucket
-- Paths are structured as: {team_id}/logo.ext
--                           {team_id}/players/{player_id}.ext
-- so RLS can scope uploads to admins/coordinadores of that team.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

drop policy if exists "team_photos_select" on storage.objects;
create policy "team_photos_select" on storage.objects for select using (
  bucket_id = 'team-photos'
);

drop policy if exists "team_photos_insert" on storage.objects;
create policy "team_photos_insert" on storage.objects for insert with check (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);

drop policy if exists "team_photos_update" on storage.objects;
create policy "team_photos_update" on storage.objects for update using (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);

drop policy if exists "team_photos_delete" on storage.objects;
create policy "team_photos_delete" on storage.objects for delete using (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);
-- ============================================================
-- TeamApp - Add optional background photo to posts/news
-- ============================================================
alter table public.posts add column if not exists photo_url text;
-- ============================================================
-- TeamApp - Player responsibilities (DT, Tesorero, extra Coordinador)
-- and per-team active sponsor
-- ============================================================

alter table public.players add column if not exists responsibility text
  check (responsibility in ('dt', 'tesorero', 'coordinador'));

-- One active sponsor image per team, set by the platform super admin,
-- shown across every section/category of that club until changed.
alter table public.teams add column if not exists sponsor_url text;
-- ============================================================
-- TeamApp - Target a post/announcement at a specific category,
-- or leave it null to publish to the general club home feed.
-- ============================================================
alter table public.posts add column if not exists category_id uuid references public.categories on delete set null;
-- ============================================================
-- TeamApp - Atomic team creation (avoids the RLS chicken-and-egg
-- problem entirely: SECURITY DEFINER bypasses the "can't SELECT a
-- team you're not a member of yet" issue by doing everything in
-- one server-side transaction instead of separate client calls).
-- ============================================================

create or replace function public.create_team(
  p_name text,
  p_slug text,
  p_sport text,
  p_primary_color text,
  p_secondary_color text
)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams;
begin
  insert into public.teams (name, slug, sport, primary_color, secondary_color, created_by)
  values (p_name, p_slug, p_sport, p_primary_color, p_secondary_color, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'admin');

  return v_team;
end;
$$;
-- ============================================================
-- TeamApp - Only the platform super admin can delete a team
-- (regular team coordinadores cannot — too destructive to leave
-- to per-club admins). Cascades remove all of that team's data:
-- players, matches, fixture, categories, posts, photos, members.
-- ============================================================

-- Fully self-contained (idempotent): this database never actually got
-- migration 005 applied, so platform_admins/is_platform_admin() are
-- created here from scratch instead of assumed to exist.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select" on public.platform_admins for select using (
  user_id = auth.uid()
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

drop policy if exists "platform_admins_insert" on public.platform_admins;
create policy "platform_admins_insert" on public.platform_admins for insert with check (
  not exists (select 1 from public.platform_admins)
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

drop policy if exists "platform_admins_delete" on public.platform_admins;
create policy "platform_admins_delete" on public.platform_admins for delete using (
  exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

drop policy if exists "teams_delete" on public.teams;
create policy "teams_delete" on public.teams for delete using (
  public.is_platform_admin()
);
-- ============================================================
-- TeamApp - Player/coordinador email invites + club titles
-- ============================================================

-- Store the email a coordinador typed in for a player, so the squad UI
-- can show it even before that person ever logs in.
alter table public.players add column if not exists email text;

-- Titles / trophies per category, set by the coordinador (replaces the
-- old hardcoded demo-only list — this is real, per-team data now).
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  tournament text not null,
  year int not null,
  created_at timestamptz default now()
);

alter table public.titles enable row level security;

drop policy if exists "titles_select" on public.titles;
create policy "titles_select" on public.titles for select using (is_team_member(team_id));
drop policy if exists "titles_insert" on public.titles;
create policy "titles_insert" on public.titles for insert with check (is_team_admin(team_id));
drop policy if exists "titles_delete" on public.titles;
create policy "titles_delete" on public.titles for delete using (is_team_admin(team_id));

-- Invites: a coordinador types someone's email (a player or a fellow
-- coordinador) before that person has ever logged in. When a user with a
-- matching email later signs in, claim_invites() below turns each pending
-- invite into real membership (and links the player row, if any).
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  email text not null,
  role text not null check (role in ('coordinador', 'player', 'dt')) default 'player',
  player_id uuid references public.players on delete cascade,
  created_at timestamptz default now()
);

alter table public.team_invites enable row level security;

drop policy if exists "team_invites_select" on public.team_invites;
create policy "team_invites_select" on public.team_invites for select using (is_team_admin(team_id));
drop policy if exists "team_invites_insert" on public.team_invites;
create policy "team_invites_insert" on public.team_invites for insert with check (is_team_admin(team_id));
drop policy if exists "team_invites_delete" on public.team_invites;
create policy "team_invites_delete" on public.team_invites for delete using (is_team_admin(team_id));

-- Runs on every login (see AuthProvider). Looks up pending invites for the
-- signed-in user's email, turns them into team_members rows, links the
-- player record if one was specified, then clears the invite.
create or replace function public.claim_invites()
returns void language plpgsql security definer as $$
declare
  v_email text;
  inv record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;

  for inv in select * from public.team_invites where lower(email) = lower(v_email) loop
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;

    if inv.player_id is not null then
      update public.players set user_id = auth.uid() where id = inv.player_id;
    end if;

    delete from public.team_invites where id = inv.id;
  end loop;
end;
$$;
-- ============================================================
-- TeamApp - Real match detail: goals/assists/cards, attendance,
-- MVP voting and lineup/formation, all keyed to fixture_matches
-- (the actual per-team schedule used by real clubs — the old
-- `matches` table was never wired to real teams and stays unused).
-- ============================================================

alter table public.fixture_matches add column if not exists location text;
alter table public.fixture_matches add column if not exists formation text;
alter table public.fixture_matches add column if not exists lineup jsonb not null default '{}'::jsonb;

-- Goals / assists / cards for a fixture match
create table if not exists public.fixture_match_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  fixture_match_id uuid references public.fixture_matches on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  type text not null check (type in ('goal', 'assist', 'yellow_card', 'red_card')),
  created_at timestamptz default now()
);

alter table public.fixture_match_events enable row level security;
drop policy if exists "fixture_match_events_select" on public.fixture_match_events;
create policy "fixture_match_events_select" on public.fixture_match_events for select using (is_team_member(team_id));
drop policy if exists "fixture_match_events_insert" on public.fixture_match_events;
create policy "fixture_match_events_insert" on public.fixture_match_events for insert with check (is_team_admin(team_id));
drop policy if exists "fixture_match_events_delete" on public.fixture_match_events;
create policy "fixture_match_events_delete" on public.fixture_match_events for delete using (is_team_admin(team_id));

-- Attendance per player per fixture match
create table if not exists public.fixture_match_attendance (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  fixture_match_id uuid references public.fixture_matches on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  status text not null check (status in ('confirmed', 'absent', 'maybe', 'no_response')) default 'no_response',
  updated_at timestamptz default now(),
  unique (fixture_match_id, player_id)
);

alter table public.fixture_match_attendance enable row level security;
drop policy if exists "fixture_match_attendance_select" on public.fixture_match_attendance;
create policy "fixture_match_attendance_select" on public.fixture_match_attendance for select using (is_team_member(team_id));
drop policy if exists "fixture_match_attendance_insert" on public.fixture_match_attendance;
create policy "fixture_match_attendance_insert" on public.fixture_match_attendance for insert with check (
  is_team_admin(team_id)
  or player_id in (select id from public.players where user_id = auth.uid())
);
drop policy if exists "fixture_match_attendance_update" on public.fixture_match_attendance;
create policy "fixture_match_attendance_update" on public.fixture_match_attendance for update using (
  is_team_admin(team_id)
  or player_id in (select id from public.players where user_id = auth.uid())
);

-- MVP votes per fixture match — each linked player can vote once, can change their vote
create table if not exists public.fixture_match_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  fixture_match_id uuid references public.fixture_matches on delete cascade not null,
  voter_player_id uuid references public.players on delete cascade not null,
  target_player_id uuid references public.players on delete cascade not null,
  updated_at timestamptz default now(),
  unique (fixture_match_id, voter_player_id)
);

alter table public.fixture_match_mvp_votes enable row level security;
drop policy if exists "fixture_match_mvp_votes_select" on public.fixture_match_mvp_votes;
create policy "fixture_match_mvp_votes_select" on public.fixture_match_mvp_votes for select using (is_team_member(team_id));
drop policy if exists "fixture_match_mvp_votes_insert" on public.fixture_match_mvp_votes;
create policy "fixture_match_mvp_votes_insert" on public.fixture_match_mvp_votes for insert with check (
  voter_player_id in (select id from public.players where user_id = auth.uid())
);
drop policy if exists "fixture_match_mvp_votes_update" on public.fixture_match_mvp_votes;
create policy "fixture_match_mvp_votes_update" on public.fixture_match_mvp_votes for update using (
  voter_player_id in (select id from public.players where user_id = auth.uid())
  or is_team_admin(team_id)
);
-- ============================================================
-- TeamApp - Player nickname, likes on posts, real photo gallery
-- ============================================================

alter table public.players add column if not exists nickname text;

-- Likes on posts/avisos — one like per user per post
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

alter table public.post_likes enable row level security;
drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes for select using (is_team_member(team_id));
drop policy if exists "post_likes_insert" on public.post_likes;
create policy "post_likes_insert" on public.post_likes for insert with check (
  is_team_member(team_id) and user_id = auth.uid()
);
drop policy if exists "post_likes_delete" on public.post_likes;
create policy "post_likes_delete" on public.post_likes for delete using (user_id = auth.uid());

-- Photos: mark some as "featured" to show in the Home carousel
alter table public.photos add column if not exists featured boolean not null default false;
-- ============================================================
-- TeamApp - Sponsors move from per-team to per-category
-- ============================================================

alter table public.categories add column if not exists sponsor_url text;

-- teams.sponsor_url is no longer used by the app (kept for backward
-- compatibility / rollback safety, not read anywhere in the UI anymore).
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
-- ============================================================
-- Fix: the platform_admins RLS policies referenced platform_admins
-- itself via a plain subquery (exists (select 1 from platform_admins
-- pa where pa.user_id = auth.uid())). Postgres re-applies RLS to that
-- inner query too, which re-evaluates the same policy again, causing
-- "infinite recursion detected in policy for relation platform_admins".
-- The query then fails silently client-side (data comes back null,
-- error is ignored), so the app always treated the real super admin
-- as a regular user.
--
-- Fix: use the existing is_platform_admin() SECURITY DEFINER function
-- instead, which bypasses RLS on its internal lookup and cannot recurse.
-- ============================================================

drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select" on public.platform_admins for select using (
  user_id = auth.uid() or public.is_platform_admin()
);

drop policy if exists "platform_admins_insert" on public.platform_admins;
create policy "platform_admins_insert" on public.platform_admins for insert with check (
  not exists (select 1 from public.platform_admins)
  or public.is_platform_admin()
);

drop policy if exists "platform_admins_delete" on public.platform_admins;
create policy "platform_admins_delete" on public.platform_admins for delete using (
  public.is_platform_admin()
);
-- ============================================================
-- Let the platform super admin see who else is an admin, grant
-- admin access to another registered user by email, and revoke it.
-- auth.users isn't exposed to the client directly, so these run as
-- SECURITY DEFINER RPCs, each re-checking is_platform_admin() itself.
-- ============================================================

create or replace function public.admin_list_platform_admins()
returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query
    select pa.user_id, u.email::text, pa.created_at
    from public.platform_admins pa
    join auth.users u on u.id = pa.user_id
    order by pa.created_at;
end;
$$;

create or replace function public.admin_grant_platform_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede otorgar acceso de administrador';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'No existe un usuario registrado con el email %', p_email;
  end if;

  insert into public.platform_admins (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.admin_revoke_platform_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede quitar acceso de administrador';
  end if;
  if (select count(*) from public.platform_admins) <= 1 then
    raise exception 'No podés quitar al único administrador de la plataforma';
  end if;

  delete from public.platform_admins where user_id = p_user_id;
end;
$$;
-- ============================================================
-- Full "Usuarios" view for the platform admin panel: one row per
-- team membership (a person can belong to more than one team/liga/
-- categoria), with email/name from auth+profiles (not client-queryable
-- directly) plus their role, league, category and player position.
-- ============================================================

create or replace function public.admin_list_users()
returns table(
  user_id uuid,
  email text,
  full_name text,
  team_id uuid,
  team_name text,
  league_name text,
  category_name text,
  player_position text,
  role text,
  is_platform_admin boolean
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query
    select
      tm.user_id,
      u.email::text,
      coalesce(p.full_name, ''),
      t.id,
      t.name,
      l.name,
      c.name,
      pl.position,
      tm.role,
      exists(select 1 from public.platform_admins pa where pa.user_id = tm.user_id)
    from public.team_members tm
    join auth.users u on u.id = tm.user_id
    left join public.profiles p on p.id = tm.user_id
    join public.teams t on t.id = tm.team_id
    left join public.leagues l on l.id = t.league_id
    left join public.players pl on pl.team_id = tm.team_id and pl.user_id = tm.user_id
    left join public.categories c on c.id = pl.category_id
    order by u.email, t.name;
end;
$$;

create or replace function public.admin_set_team_member_role(p_team_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede cambiar el rol';
  end if;
  if p_role not in ('admin', 'captain', 'player', 'dt', 'coordinador') then
    raise exception 'Rol inválido: %', p_role;
  end if;
  update public.team_members set role = p_role where team_id = p_team_id and user_id = p_user_id;
end;
$$;
-- ============================================================
-- Re-create admin_set_team_coordinador: the admin panel's "add
-- coordinador" button got "Could not find the function ... in the
-- schema cache", meaning this RPC (originally defined in migration
-- 005) was never actually applied to this database. Recreated here
-- plus an explicit PostgREST schema-cache reload so it's callable
-- immediately.
-- ============================================================

create or replace function public.admin_set_team_coordinador(p_team_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede asignar coordinadores';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'No existe un usuario registrado con el email %', p_email;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, 'coordinador')
  on conflict (team_id, user_id) do update set role = 'coordinador';
end;
$$;

notify pgrst, 'reload schema';
-- ============================================================
-- team_members_role_check still only allowed the original 3 roles
-- (admin, captain, player) — 'coordinador'/'dt' from migration 005
-- never actually got applied to this database either, so inserting
-- a coordinador failed with "violates check constraint
-- team_members_role_check".
-- ============================================================

alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'captain', 'player', 'dt', 'coordinador'));
-- ============================================================
-- Let the super admin grant platform-admin access to an email that
-- hasn't signed up yet. Same pattern as team_invites: queue it, then
-- claim_invites() (already called on every login) turns it into a
-- real platform_admins row once that person creates their account.
-- ============================================================

create table if not exists public.platform_admin_invites (
  email text primary key,
  created_at timestamptz default now()
);

alter table public.platform_admin_invites enable row level security;

drop policy if exists "platform_admin_invites_all" on public.platform_admin_invites;
create policy "platform_admin_invites_all" on public.platform_admin_invites for all using (is_platform_admin()) with check (is_platform_admin());

-- Now grants immediately if the user already exists, otherwise queues an
-- invite instead of raising. Returns 'granted' or 'invited' so the UI can
-- show the right message. Return type changed from void, so the old
-- function must be dropped first (CREATE OR REPLACE can't do that).
drop function if exists public.admin_grant_platform_admin(text);

create or replace function public.admin_grant_platform_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede otorgar acceso de administrador';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is not null then
    insert into public.platform_admins (user_id) values (v_user_id) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(p_email);
    return 'granted';
  else
    insert into public.platform_admin_invites (email) values (lower(p_email)) on conflict (email) do nothing;
    return 'invited';
  end if;
end;
$$;

create or replace function public.admin_list_pending_admin_invites()
returns table(email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query select pai.email, pai.created_at from public.platform_admin_invites pai order by pai.created_at;
end;
$$;

create or replace function public.admin_cancel_platform_admin_invite(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede cancelar esta invitación';
  end if;
  delete from public.platform_admin_invites where lower(email) = lower(p_email);
end;
$$;

-- claim_invites() now also claims a pending platform-admin invite for the
-- signed-in user's email, in addition to the existing team_invites logic.
create or replace function public.claim_invites()
returns void language plpgsql security definer as $$
declare
  v_email text;
  inv record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;

  for inv in select * from public.team_invites where lower(email) = lower(v_email) loop
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;

    if inv.player_id is not null then
      update public.players set user_id = auth.uid() where id = inv.player_id;
    end if;

    delete from public.team_invites where id = inv.id;
  end loop;

  if exists (select 1 from public.platform_admin_invites where lower(email) = lower(v_email)) then
    insert into public.platform_admins (user_id) values (auth.uid()) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(v_email);
  end if;
end;
$$;
-- ============================================================
-- Sponsor banners are now clickable: an optional destination URL per
-- category, set by the platform admin alongside the sponsor image.
-- ============================================================

alter table public.categories add column if not exists sponsor_link_url text;
-- ============================================================
-- Leagues had no delete policy — the platform admin couldn't remove
-- one even though the UI needed it. Teams referencing a deleted
-- league already fall back to league_id = null (on delete set null
-- from migration 017), so this is safe.
-- ============================================================

drop policy if exists "leagues_delete" on public.leagues;
create policy "leagues_delete" on public.leagues for delete using (is_platform_admin());
-- ============================================================
-- Let a player upload/replace/remove their OWN photo in the
-- team-photos bucket, in addition to team admins/coordinadores.
-- Player photos live at "{team_id}/players/{player_id}.{ext}".
-- ============================================================

drop policy if exists "team_photos_insert" on storage.objects;
create policy "team_photos_insert" on storage.objects for insert with check (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

drop policy if exists "team_photos_update" on storage.objects;
create policy "team_photos_update" on storage.objects for update using (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

drop policy if exists "team_photos_delete" on storage.objects;
create policy "team_photos_delete" on storage.objects for delete using (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

-- The general players_update RLS policy stays admin-only (a player still
-- can't edit their own position/number/name from the browser) — this RPC
-- narrowly allows only the linked player themselves, or a team admin, to
-- change just the photo.
create or replace function public.player_set_photo(p_player_id uuid, p_photo_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  select team_id, user_id into v_team_id, v_user_id from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Jugador no encontrado';
  end if;
  if auth.uid() is distinct from v_user_id and not is_team_admin(v_team_id) then
    raise exception 'No tenés permiso para cambiar esta foto';
  end if;
  update public.players set photo_url = p_photo_url where id = p_player_id;
end;
$$;
-- ============================================================
-- Secure player ↔ account linking.
--
-- Before this migration, claim_invites() silently linked ANY pending
-- team_invites row (including role='player' with a player_id) the
-- instant someone with a matching email logged in — no confirmation
-- screen, no "is this you?" step. That's replaced here with an
-- explicit, one-time confirmation flow:
--   1. A coordinador invites a player (existing team_invites insert,
--      unchanged) — the invite row's own id is the shareable token,
--      e.g. /invite/<id>.
--   2. Whoever opens that link sees a public, minimal preview (club,
--      categoría, nombre/número de la ficha) via get_invite_preview(),
--      before logging in.
--   3. After they log in/register, claim_player_invite() does the
--      atomic, server-checked link: email must match the invite,
--      the ficha must not already be linked to someone else.
-- claim_invites() still auto-applies invites that AREN'T tied to a
-- specific player ficha (role='coordinador', or role='player' with no
-- player_id) — those never had an identity-confusion risk.
--
-- Also adds: self-serve "soy jugador de este equipo" requests (with
-- coordinador approval), an unlink RPC, and a minimal audit trail —
-- none of which existed before.
-- ============================================================

create or replace function public.claim_invites()
returns void language plpgsql security definer as $$
declare
  v_email text;
  inv record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;

  for inv in
    select * from public.team_invites
    where lower(email) = lower(v_email)
      and not (role = 'player' and player_id is not null)
  loop
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;

    delete from public.team_invites where id = inv.id;
  end loop;

  if exists (select 1 from public.platform_admin_invites where lower(email) = lower(v_email)) then
    insert into public.platform_admins (user_id) values (auth.uid()) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(v_email);
  end if;
end;
$$;

-- Public, minimal preview of a pending player invite — safe to call
-- before login since it never exposes the invite's email.
create or replace function public.get_invite_preview(p_invite_id uuid)
returns table(
  team_name text,
  team_slug text,
  category_name text,
  player_name text,
  player_number int,
  role text,
  valid boolean
)
language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.team_invites where id = p_invite_id;
  if inv is null then
    return query select null::text, null::text, null::text, null::text, null::int, null::text, false;
    return;
  end if;

  return query
    select t.name, t.slug, c.name, p.name, p.number, inv.role, true
    from public.team_invites i
    join public.teams t on t.id = i.team_id
    left join public.players p on p.id = i.player_id
    left join public.categories c on c.id = p.category_id
    where i.id = p_invite_id;
end;
$$;
grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

-- Atomic, server-checked claim: only the invited email can confirm,
-- and only if the target ficha isn't already linked to someone else.
create or replace function public.claim_player_invite(p_invite_id uuid)
returns table(team_slug text, team_id uuid, category_id uuid, player_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  v_email text;
  v_existing_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión primero';
  end if;

  select * into inv from public.team_invites where id = p_invite_id;
  if inv is null then
    raise exception 'Esta invitación ya no existe o ya fue usada';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if lower(v_email) is distinct from lower(inv.email) then
    raise exception 'Esta invitación es para otro email (%), no para el tuyo', inv.email;
  end if;

  if inv.player_id is not null then
    select user_id into v_existing_user from public.players where id = inv.player_id;
    if v_existing_user is not null and v_existing_user is distinct from auth.uid() then
      raise exception 'Esa ficha ya está vinculada a otra cuenta';
    end if;
    update public.players set user_id = auth.uid() where id = inv.player_id;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (inv.team_id, auth.uid(), inv.role)
  on conflict (team_id, user_id) do nothing;

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (inv.player_id, inv.team_id, auth.uid(), 'claimed_via_invite');

  delete from public.team_invites where id = p_invite_id;

  return query
    select t.slug, t.id, p.category_id, inv.player_id
    from public.teams t
    left join public.players p on p.id = inv.player_id
    where t.id = inv.team_id;
end;
$$;

-- ── Self-serve "soy jugador de este equipo" requests ───────────────────────
create table if not exists public.player_link_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique (player_id, user_id)
);

alter table public.player_link_requests enable row level security;
drop policy if exists "player_link_requests_select" on public.player_link_requests;
create policy "player_link_requests_select" on public.player_link_requests for select using (
  user_id = auth.uid() or is_team_admin(team_id)
);
drop policy if exists "player_link_requests_insert" on public.player_link_requests;
create policy "player_link_requests_insert" on public.player_link_requests for insert with check (
  user_id = auth.uid()
);
drop policy if exists "player_link_requests_delete" on public.player_link_requests;
create policy "player_link_requests_delete" on public.player_link_requests for delete using (
  user_id = auth.uid() or is_team_admin(team_id)
);

create or replace function public.request_player_link(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_existing_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión primero';
  end if;

  select team_id, user_id into v_team_id, v_existing_user from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Ficha no encontrada';
  end if;
  if v_existing_user is not null then
    raise exception 'Esa ficha ya está vinculada a una cuenta';
  end if;

  insert into public.player_link_requests (team_id, player_id, user_id)
  values (v_team_id, p_player_id, auth.uid())
  on conflict (player_id, user_id) do update set status = 'pending', resolved_at = null;
end;
$$;

create or replace function public.approve_player_link_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  req record;
  v_existing_user uuid;
begin
  select * into req from public.player_link_requests where id = p_request_id;
  if req is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if not is_team_admin(req.team_id) then
    raise exception 'Solo un coordinador de este club puede aprobar';
  end if;

  select user_id into v_existing_user from public.players where id = req.player_id;
  if v_existing_user is not null and v_existing_user is distinct from req.user_id then
    raise exception 'Esa ficha ya fue vinculada a otra cuenta';
  end if;

  update public.players set user_id = req.user_id where id = req.player_id;
  insert into public.team_members (team_id, user_id, role)
  values (req.team_id, req.user_id, 'player')
  on conflict (team_id, user_id) do nothing;

  update public.player_link_requests set status = 'approved', resolved_at = now() where id = p_request_id;

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (req.player_id, req.team_id, auth.uid(), 'approved_request');
end;
$$;

create or replace function public.reject_player_link_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  req record;
begin
  select * into req from public.player_link_requests where id = p_request_id;
  if req is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if not is_team_admin(req.team_id) then
    raise exception 'Solo un coordinador de este club puede rechazar';
  end if;
  update public.player_link_requests set status = 'rejected', resolved_at = now() where id = p_request_id;
end;
$$;

-- ── Undo a wrong link — keeps the ficha, its stats, photos and events;
--    only removes the account↔ficha association and the 'player' team
--    membership that came from it (any other role that person has on
--    the same team, e.g. coordinador, is left untouched). ────────────
create or replace function public.unlink_player(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  select team_id, user_id into v_team_id, v_user_id from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Ficha no encontrada';
  end if;
  if v_user_id is null then
    return; -- already unlinked, nothing to do
  end if;
  if auth.uid() is distinct from v_user_id and not is_team_admin(v_team_id) then
    raise exception 'No tenés permiso para desvincular esta ficha';
  end if;

  update public.players set user_id = null where id = p_player_id;

  delete from public.team_members
  where team_id = v_team_id and user_id = v_user_id and role = 'player'
    and not exists (select 1 from public.players where team_id = v_team_id and user_id = v_user_id);

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (p_player_id, v_team_id, auth.uid(), 'unlinked');
end;
$$;

-- ── Minimal audit trail ─────────────────────────────────────────────────────
create table if not exists public.player_link_audit (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players on delete set null,
  team_id uuid references public.teams on delete cascade not null,
  actor_user_id uuid references auth.users on delete set null,
  action text not null,
  created_at timestamptz default now()
);
alter table public.player_link_audit enable row level security;
drop policy if exists "player_link_audit_select" on public.player_link_audit;
create policy "player_link_audit_select" on public.player_link_audit for select using (is_team_admin(team_id));

-- Minimal public roster (name/number/category/whether already linked) so
-- someone who lands on a club without membership — and without a specific
-- invite link — can still say "soy jugador de este equipo" and pick
-- themselves, without exposing emails or other private fields.
create or replace function public.list_team_players_public(p_team_id uuid)
returns table(id uuid, name text, number int, category_name text, already_linked boolean)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.number, c.name, (p.user_id is not null)
  from public.players p
  left join public.categories c on c.id = p.category_id
  where p.team_id = p_team_id and p.is_active
  order by p.name;
$$;
grant execute on function public.list_team_players_public(uuid) to authenticated;

-- So a pending request shows the requester's name/email to the coordinador
-- approving it (player_link_requests itself only stores user_id).
create or replace function public.list_pending_link_requests(p_team_id uuid)
returns table(id uuid, player_id uuid, player_name text, user_email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_team_admin(p_team_id) then
    raise exception 'Solo un coordinador de este club puede ver esto';
  end if;
  return query
    select r.id, r.player_id, p.name, u.email::text, r.created_at
    from public.player_link_requests r
    join public.players p on p.id = r.player_id
    join auth.users u on u.id = r.user_id
    where r.team_id = p_team_id and r.status = 'pending'
    order by r.created_at;
end;
$$;
-- Run this SELECT and paste me the full result table
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename in ('teams', 'team_members')
order by tablename, policyname;
