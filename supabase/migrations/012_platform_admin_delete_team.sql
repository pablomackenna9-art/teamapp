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
