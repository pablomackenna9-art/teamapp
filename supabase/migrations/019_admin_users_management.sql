-- ============================================================
-- Let the platform super admin see who else is an admin, grant
-- admin access to another registered user by email, and revoke it.
-- auth.users isn't exposed to the client directly, so these run as
-- SECURITY DEFINER RPCs, each re-checking is_platform_admin() itself.
-- ============================================================

create or replace function public.admin_list_platform_admins()
returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query
    select pa.user_id, u.email::text, pa.created_at
    from public.platform_admins pa
    join auth.users u on u.id = pa.user_id
    order by pa.created_at;
end;
$$;

create or replace function public.admin_grant_platform_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede otorgar acceso de administrador';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'No existe un usuario registrado con el email %', p_email;
  end if;

  insert into public.platform_admins (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.admin_revoke_platform_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede quitar acceso de administrador';
  end if;
  if (select count(*) from public.platform_admins) <= 1 then
    raise exception 'No podés quitar al único administrador de la plataforma';
  end if;

  delete from public.platform_admins where user_id = p_user_id;
end;
$$;
