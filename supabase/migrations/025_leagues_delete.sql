-- ============================================================
-- Leagues had no delete policy — the platform admin couldn't remove
-- one even though the UI needed it. Teams referencing a deleted
-- league already fall back to league_id = null (on delete set null
-- from migration 017), so this is safe.
-- ============================================================

drop policy if exists "leagues_delete" on public.leagues;
create policy "leagues_delete" on public.leagues for delete using (is_platform_admin());
