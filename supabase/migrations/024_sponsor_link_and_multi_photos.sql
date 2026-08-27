-- ============================================================
-- Sponsor banners are now clickable: an optional destination URL per
-- category, set by the platform admin alongside the sponsor image.
-- ============================================================

alter table public.categories add column if not exists sponsor_link_url text;
