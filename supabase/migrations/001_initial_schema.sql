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
