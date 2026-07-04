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
