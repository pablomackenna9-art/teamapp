-- ============================================================
-- TeamApp - Add optional background photo to posts/news
-- ============================================================
alter table public.posts add column if not exists photo_url text;
