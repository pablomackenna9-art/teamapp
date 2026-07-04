-- ============================================================
-- TeamApp - Target a post/announcement at a specific category,
-- or leave it null to publish to the general club home feed.
-- ============================================================
alter table public.posts add column if not exists category_id uuid references public.categories on delete set null;
