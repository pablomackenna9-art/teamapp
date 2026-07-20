-- ============================================================
-- TeamApp - Player nickname, likes on posts, real photo gallery
-- ============================================================

alter table public.players add column if not exists nickname text;

-- Likes on posts/avisos — one like per user per post
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

alter table public.post_likes enable row level security;
drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes for select using (is_team_member(team_id));
drop policy if exists "post_likes_insert" on public.post_likes;
create policy "post_likes_insert" on public.post_likes for insert with check (
  is_team_member(team_id) and user_id = auth.uid()
);
drop policy if exists "post_likes_delete" on public.post_likes;
create policy "post_likes_delete" on public.post_likes for delete using (user_id = auth.uid());

-- Photos: mark some as "featured" to show in the Home carousel
alter table public.photos add column if not exists featured boolean not null default false;
