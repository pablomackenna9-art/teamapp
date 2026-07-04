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
