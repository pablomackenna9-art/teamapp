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
