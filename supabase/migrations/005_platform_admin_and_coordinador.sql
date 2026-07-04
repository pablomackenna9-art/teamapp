-- ============================================================
-- TeamApp - Platform super-admin + "coordinador" per-club role
-- ============================================================

-- Platform admins: users who can see/manage ALL teams (the app owner)
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.platform_admins enable row level security;

-- Anyone can check if THEY are an admin; existing admins can see the full list
drop policy if exists "platform_admins_select" on public.platform_admins;
create policy "platform_admins_select" on public.platform_admins for select using (
  user_id = auth.uid()
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

-- Bootstrap pattern: if the table is empty, anyone can make themselves the
-- first admin. After that, only existing admins can add new ones.
drop policy if exists "platform_admins_insert" on public.platform_admins;
create policy "platform_admins_insert" on public.platform_admins for insert with check (
  not exists (select 1 from public.platform_admins)
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

drop policy if exists "platform_admins_delete" on public.platform_admins;
create policy "platform_admins_delete" on public.platform_admins for delete using (
  exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

-- Helper function
create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Allow 'coordinador' as a per-club role (same privileges as 'admin' for that club)
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'captain', 'player', 'dt', 'coordinador'));

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
      and role in ('admin', 'captain', 'dt', 'coordinador')
  ) or public.is_platform_admin();
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

-- Teams: platform admin can see + manage every team
drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams for select using (
  is_team_member(id) or created_by = auth.uid() or is_platform_admin()
);

drop policy if exists "teams_update" on public.teams;
create policy "teams_update" on public.teams for update using (
  is_team_admin(id) or is_platform_admin()
);

-- Team members: platform admin can see/manage every team's roster
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members for select using (
  is_team_member(team_id) or is_platform_admin()
);

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members for insert with check (
  is_team_admin(team_id)
  or auth.uid() = (select created_by from public.teams where id = team_id limit 1)
  or is_platform_admin()
);

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members for delete using (
  is_team_admin(team_id) or is_platform_admin()
);

-- RPC: platform admin adds/updates a "coordinador" for a team by email
-- (SECURITY DEFINER so it can look up auth.users by email safely)
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
