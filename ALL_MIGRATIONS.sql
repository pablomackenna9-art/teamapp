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
