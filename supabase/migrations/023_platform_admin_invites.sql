-- ============================================================
-- Let the super admin grant platform-admin access to an email that
-- hasn't signed up yet. Same pattern as team_invites: queue it, then
-- claim_invites() (already called on every login) turns it into a
-- real platform_admins row once that person creates their account.
-- ============================================================

create table if not exists public.platform_admin_invites (
  email text primary key,
  created_at timestamptz default now()
);

alter table public.platform_admin_invites enable row level security;

drop policy if exists "platform_admin_invites_all" on public.platform_admin_invites;
create policy "platform_admin_invites_all" on public.platform_admin_invites for all using (is_platform_admin()) with check (is_platform_admin());

-- Now grants immediately if the user already exists, otherwise queues an
-- invite instead of raising. Returns 'granted' or 'invited' so the UI can
-- show the right message.
create or replace function public.admin_grant_platform_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede otorgar acceso de administrador';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is not null then
    insert into public.platform_admins (user_id) values (v_user_id) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(p_email);
    return 'granted';
  else
    insert into public.platform_admin_invites (email) values (lower(p_email)) on conflict (email) do nothing;
    return 'invited';
  end if;
end;
$$;

create or replace function public.admin_list_pending_admin_invites()
returns table(email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede ver esta lista';
  end if;
  return query select pai.email, pai.created_at from public.platform_admin_invites pai order by pai.created_at;
end;
$$;

create or replace function public.admin_cancel_platform_admin_invite(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede cancelar esta invitación';
  end if;
  delete from public.platform_admin_invites where lower(email) = lower(p_email);
end;
$$;

-- claim_invites() now also claims a pending platform-admin invite for the
-- signed-in user's email, in addition to the existing team_invites logic.
create or replace function public.claim_invites()
returns void language plpgsql security definer as $$
declare
  v_email text;
  inv record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;

  for inv in select * from public.team_invites where lower(email) = lower(v_email) loop
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;

    if inv.player_id is not null then
      update public.players set user_id = auth.uid() where id = inv.player_id;
    end if;

    delete from public.team_invites where id = inv.id;
  end loop;

  if exists (select 1 from public.platform_admin_invites where lower(email) = lower(v_email)) then
    insert into public.platform_admins (user_id) values (auth.uid()) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(v_email);
  end if;
end;
$$;
