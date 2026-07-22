-- ============================================================
-- Re-create admin_set_team_coordinador: the admin panel's "add
-- coordinador" button got "Could not find the function ... in the
-- schema cache", meaning this RPC (originally defined in migration
-- 005) was never actually applied to this database. Recreated here
-- plus an explicit PostgREST schema-cache reload so it's callable
-- immediately.
-- ============================================================

create or replace function public.admin_set_team_coordinador(p_team_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede asignar coordinadores';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'No existe un usuario registrado con el email %', p_email;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, 'coordinador')
  on conflict (team_id, user_id) do update set role = 'coordinador';
end;
$$;

notify pgrst, 'reload schema';
