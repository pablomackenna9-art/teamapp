-- ============================================================
-- Let a player upload/replace/remove their OWN photo in the
-- team-photos bucket, in addition to team admins/coordinadores.
-- Player photos live at "{team_id}/players/{player_id}.{ext}".
-- ============================================================

drop policy if exists "team_photos_insert" on storage.objects;
create policy "team_photos_insert" on storage.objects for insert with check (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

drop policy if exists "team_photos_update" on storage.objects;
create policy "team_photos_update" on storage.objects for update using (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

drop policy if exists "team_photos_delete" on storage.objects;
create policy "team_photos_delete" on storage.objects for delete using (
  bucket_id = 'team-photos'
  and (
    is_team_admin((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and name = p.team_id::text || '/players/' || p.id::text || substring(name from '\.[^./]+$')
    )
  )
);

-- The general players_update RLS policy stays admin-only (a player still
-- can't edit their own position/number/name from the browser) — this RPC
-- narrowly allows only the linked player themselves, or a team admin, to
-- change just the photo.
create or replace function public.player_set_photo(p_player_id uuid, p_photo_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  select team_id, user_id into v_team_id, v_user_id from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Jugador no encontrado';
  end if;
  if auth.uid() is distinct from v_user_id and not is_team_admin(v_team_id) then
    raise exception 'No tenés permiso para cambiar esta foto';
  end if;
  update public.players set photo_url = p_photo_url where id = p_player_id;
end;
$$;
