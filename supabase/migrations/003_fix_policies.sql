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
