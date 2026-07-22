-- ============================================================
-- Full "Usuarios" view for the platform admin panel: one row per
-- team membership (a person can belong to more than one team/liga/
-- categoria), with email/name from auth+profiles (not client-queryable
-- directly) plus their role, league, category and player position.
-- ============================================================

create or replace function public.admin_list_users()
returns table(
  user_id uuid,
  email text,
  full_name text,
  team_id uuid,
  team_name text,
  league_name text,
  category_name text,
  position text,
  role text,
  is_platform_admin boolean
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query
    select
      tm.user_id,
      u.email::text,
      coalesce(p.full_name, ''),
      t.id,
      t.name,
      l.name,
      c.name,
      pl.position,
      tm.role,
      exists(select 1 from public.platform_admins pa where pa.user_id = tm.user_id)
    from public.team_members tm
    join auth.users u on u.id = tm.user_id
    left join public.profiles p on p.id = tm.user_id
    join public.teams t on t.id = tm.team_id
    left join public.leagues l on l.id = t.league_id
    left join public.players pl on pl.team_id = tm.team_id and pl.user_id = tm.user_id
    left join public.categories c on c.id = pl.category_id
    order by u.email, t.name;
end;
$$;

create or replace function public.admin_set_team_member_role(p_team_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede cambiar el rol';
  end if;
  if p_role not in ('admin', 'captain', 'player', 'dt', 'coordinador') then
    raise exception 'Rol inválido: %', p_role;
  end if;
  update public.team_members set role = p_role where team_id = p_team_id and user_id = p_user_id;
end;
$$;
