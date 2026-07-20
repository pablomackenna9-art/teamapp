-- ============================================================
-- TeamApp - Sponsors move from per-team to per-category
-- ============================================================

alter table public.categories add column if not exists sponsor_url text;

-- teams.sponsor_url is no longer used by the app (kept for backward
-- compatibility / rollback safety, not read anywhere in the UI anymore).
