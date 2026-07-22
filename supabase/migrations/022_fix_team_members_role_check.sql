-- ============================================================
-- team_members_role_check still only allowed the original 3 roles
-- (admin, captain, player) — 'coordinador'/'dt' from migration 005
-- never actually got applied to this database either, so inserting
-- a coordinador failed with "violates check constraint
-- team_members_role_check".
-- ============================================================

alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'captain', 'player', 'dt', 'coordinador'));
