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
