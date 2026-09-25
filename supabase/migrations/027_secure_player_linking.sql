-- ============================================================
-- Secure player ↔ account linking.
--
-- Before this migration, claim_invites() silently linked ANY pending
-- team_invites row (including role='player' with a player_id) the
-- instant someone with a matching email logged in — no confirmation
-- screen, no "is this you?" step. That's replaced here with an
-- explicit, one-time confirmation flow:
--   1. A coordinador invites a player (existing team_invites insert,
--      unchanged) — the invite row's own id is the shareable token,
--      e.g. /invite/<id>.
--   2. Whoever opens that link sees a public, minimal preview (club,
--      categoría, nombre/número de la ficha) via get_invite_preview(),
--      before logging in.
--   3. After they log in/register, claim_player_invite() does the
--      atomic, server-checked link: email must match the invite,
--      the ficha must not already be linked to someone else.
-- claim_invites() still auto-applies invites that AREN'T tied to a
-- specific player ficha (role='coordinador', or role='player' with no
-- player_id) — those never had an identity-confusion risk.
--
-- Also adds: self-serve "soy jugador de este equipo" requests (with
-- coordinador approval), an unlink RPC, and a minimal audit trail —
-- none of which existed before.
-- ============================================================

create or replace function public.claim_invites()
returns void language plpgsql security definer as $$
declare
  v_email text;
  inv record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return; end if;

  for inv in
    select * from public.team_invites
    where lower(email) = lower(v_email)
      and not (role = 'player' and player_id is not null)
  loop
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;

    delete from public.team_invites where id = inv.id;
  end loop;

  if exists (select 1 from public.platform_admin_invites where lower(email) = lower(v_email)) then
    insert into public.platform_admins (user_id) values (auth.uid()) on conflict (user_id) do nothing;
    delete from public.platform_admin_invites where lower(email) = lower(v_email);
  end if;
end;
$$;

-- Public, minimal preview of a pending player invite — safe to call
-- before login since it never exposes the invite's email.
create or replace function public.get_invite_preview(p_invite_id uuid)
returns table(
  team_name text,
  team_slug text,
  category_name text,
  player_name text,
  player_number int,
  role text,
  valid boolean
)
language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.team_invites where id = p_invite_id;
  if inv is null then
    return query select null::text, null::text, null::text, null::text, null::int, null::text, false;
    return;
  end if;

  return query
    select t.name, t.slug, c.name, p.name, p.number, inv.role, true
    from public.team_invites i
    join public.teams t on t.id = i.team_id
    left join public.players p on p.id = i.player_id
    left join public.categories c on c.id = p.category_id
    where i.id = p_invite_id;
end;
$$;
grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

-- Atomic, server-checked claim: only the invited email can confirm,
-- and only if the target ficha isn't already linked to someone else.
create or replace function public.claim_player_invite(p_invite_id uuid)
returns table(team_slug text, team_id uuid, category_id uuid, player_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  v_email text;
  v_existing_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión primero';
  end if;

  select * into inv from public.team_invites where id = p_invite_id;
  if inv is null then
    raise exception 'Esta invitación ya no existe o ya fue usada';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if lower(v_email) is distinct from lower(inv.email) then
    raise exception 'Esta invitación es para otro email (%), no para el tuyo', inv.email;
  end if;

  if inv.player_id is not null then
    select user_id into v_existing_user from public.players where id = inv.player_id;
    if v_existing_user is not null and v_existing_user is distinct from auth.uid() then
      raise exception 'Esa ficha ya está vinculada a otra cuenta';
    end if;
    update public.players set user_id = auth.uid() where id = inv.player_id;
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (inv.team_id, auth.uid(), inv.role)
  on conflict (team_id, user_id) do nothing;

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (inv.player_id, inv.team_id, auth.uid(), 'claimed_via_invite');

  delete from public.team_invites where id = p_invite_id;

  return query
    select t.slug, t.id, p.category_id, inv.player_id
    from public.teams t
    left join public.players p on p.id = inv.player_id
    where t.id = inv.team_id;
end;
$$;

-- ── Self-serve "soy jugador de este equipo" requests ───────────────────────
create table if not exists public.player_link_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  player_id uuid references public.players on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz,
  unique (player_id, user_id)
);

alter table public.player_link_requests enable row level security;
drop policy if exists "player_link_requests_select" on public.player_link_requests;
create policy "player_link_requests_select" on public.player_link_requests for select using (
  user_id = auth.uid() or is_team_admin(team_id)
);
drop policy if exists "player_link_requests_insert" on public.player_link_requests;
create policy "player_link_requests_insert" on public.player_link_requests for insert with check (
  user_id = auth.uid()
);
drop policy if exists "player_link_requests_delete" on public.player_link_requests;
create policy "player_link_requests_delete" on public.player_link_requests for delete using (
  user_id = auth.uid() or is_team_admin(team_id)
);

create or replace function public.request_player_link(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_existing_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión primero';
  end if;

  select team_id, user_id into v_team_id, v_existing_user from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Ficha no encontrada';
  end if;
  if v_existing_user is not null then
    raise exception 'Esa ficha ya está vinculada a una cuenta';
  end if;

  insert into public.player_link_requests (team_id, player_id, user_id)
  values (v_team_id, p_player_id, auth.uid())
  on conflict (player_id, user_id) do update set status = 'pending', resolved_at = null;
end;
$$;

create or replace function public.approve_player_link_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  req record;
  v_existing_user uuid;
begin
  select * into req from public.player_link_requests where id = p_request_id;
  if req is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if not is_team_admin(req.team_id) then
    raise exception 'Solo un coordinador de este club puede aprobar';
  end if;

  select user_id into v_existing_user from public.players where id = req.player_id;
  if v_existing_user is not null and v_existing_user is distinct from req.user_id then
    raise exception 'Esa ficha ya fue vinculada a otra cuenta';
  end if;

  update public.players set user_id = req.user_id where id = req.player_id;
  insert into public.team_members (team_id, user_id, role)
  values (req.team_id, req.user_id, 'player')
  on conflict (team_id, user_id) do nothing;

  update public.player_link_requests set status = 'approved', resolved_at = now() where id = p_request_id;

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (req.player_id, req.team_id, auth.uid(), 'approved_request');
end;
$$;

create or replace function public.reject_player_link_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  req record;
begin
  select * into req from public.player_link_requests where id = p_request_id;
  if req is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if not is_team_admin(req.team_id) then
    raise exception 'Solo un coordinador de este club puede rechazar';
  end if;
  update public.player_link_requests set status = 'rejected', resolved_at = now() where id = p_request_id;
end;
$$;

-- ── Undo a wrong link — keeps the ficha, its stats, photos and events;
--    only removes the account↔ficha association and the 'player' team
--    membership that came from it (any other role that person has on
--    the same team, e.g. coordinador, is left untouched). ────────────
create or replace function public.unlink_player(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  select team_id, user_id into v_team_id, v_user_id from public.players where id = p_player_id;
  if v_team_id is null then
    raise exception 'Ficha no encontrada';
  end if;
  if v_user_id is null then
    return; -- already unlinked, nothing to do
  end if;
  if auth.uid() is distinct from v_user_id and not is_team_admin(v_team_id) then
    raise exception 'No tenés permiso para desvincular esta ficha';
  end if;

  update public.players set user_id = null where id = p_player_id;

  delete from public.team_members
  where team_id = v_team_id and user_id = v_user_id and role = 'player'
    and not exists (select 1 from public.players where team_id = v_team_id and user_id = v_user_id);

  insert into public.player_link_audit (player_id, team_id, actor_user_id, action)
  values (p_player_id, v_team_id, auth.uid(), 'unlinked');
end;
$$;

-- ── Minimal audit trail ─────────────────────────────────────────────────────
create table if not exists public.player_link_audit (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players on delete set null,
  team_id uuid references public.teams on delete cascade not null,
  actor_user_id uuid references auth.users on delete set null,
  action text not null,
  created_at timestamptz default now()
);
alter table public.player_link_audit enable row level security;
drop policy if exists "player_link_audit_select" on public.player_link_audit;
create policy "player_link_audit_select" on public.player_link_audit for select using (is_team_admin(team_id));

-- Minimal public roster (name/number/category/whether already linked) so
-- someone who lands on a club without membership — and without a specific
-- invite link — can still say "soy jugador de este equipo" and pick
-- themselves, without exposing emails or other private fields.
create or replace function public.list_team_players_public(p_team_id uuid)
returns table(id uuid, name text, number int, category_name text, already_linked boolean)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.number, c.name, (p.user_id is not null)
  from public.players p
  left join public.categories c on c.id = p.category_id
  where p.team_id = p_team_id and p.is_active
  order by p.name;
$$;
grant execute on function public.list_team_players_public(uuid) to authenticated;

-- So a pending request shows the requester's name/email to the coordinador
-- approving it (player_link_requests itself only stores user_id).
create or replace function public.list_pending_link_requests(p_team_id uuid)
returns table(id uuid, player_id uuid, player_name text, user_email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_team_admin(p_team_id) then
    raise exception 'Solo un coordinador de este club puede ver esto';
  end if;
  return query
    select r.id, r.player_id, p.name, u.email::text, r.created_at
    from public.player_link_requests r
    join public.players p on p.id = r.player_id
    join auth.users u on u.id = r.user_id
    where r.team_id = p_team_id and r.status = 'pending'
    order by r.created_at;
end;
$$;
