-- ============================================================
-- TeamApp - Player responsibilities (DT, Tesorero, extra Coordinador)
-- and per-team active sponsor
-- ============================================================

alter table public.players add column if not exists responsibility text
  check (responsibility in ('dt', 'tesorero', 'coordinador'));

-- One active sponsor image per team, set by the platform super admin,
-- shown across every section/category of that club until changed.
alter table public.teams add column if not exists sponsor_url text;
