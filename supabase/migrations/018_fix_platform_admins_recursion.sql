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
