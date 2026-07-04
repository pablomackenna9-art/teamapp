-- ============================================================
-- TeamApp - Storage RLS for the "team-photos" bucket
-- Paths are structured as: {team_id}/logo.ext
--                           {team_id}/players/{player_id}.ext
-- so RLS can scope uploads to admins/coordinadores of that team.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

drop policy if exists "team_photos_select" on storage.objects;
create policy "team_photos_select" on storage.objects for select using (
  bucket_id = 'team-photos'
);

drop policy if exists "team_photos_insert" on storage.objects;
create policy "team_photos_insert" on storage.objects for insert with check (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);

drop policy if exists "team_photos_update" on storage.objects;
create policy "team_photos_update" on storage.objects for update using (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);

drop policy if exists "team_photos_delete" on storage.objects;
create policy "team_photos_delete" on storage.objects for delete using (
  bucket_id = 'team-photos'
  and is_team_admin((storage.foldername(name))[1]::uuid)
);
