-- ============================================================
-- TeamApp - Player/coordinador email invites + club titles
-- ============================================================

-- Store the email a coordinador typed in for a player, so the squad UI
-- can show it even before that person ever logs in.
alter table public.players add column if not exists email text;

-- Titles / trophies per category, set by the coordinador (replaces the
-- old hardcoded demo-only list — this is real, per-team data now).
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  tournament text not null,
  year int not null,
  created_at timestamptz default now()
);

alter table public.titles enable row level security;

drop policy if exists "titles_select" on public.titles;
create policy "titles_select" on public.titles for select using (is_team_member(team_id));
drop policy if exists "titles_insert" on public.titles;
create policy "titles_insert" on public.titles for insert with check (is_team_admin(team_id));
drop policy if exists "titles_delete" on public.titles;
create policy "titles_delete" on public.titles for delete using (is_team_admin(team_id));

-- Invites: a coordinador types someone's email (a player or a fellow
-- coordinador) before that person has ever logged in. When a user with a
-- matching email later signs in, claim_invites() below turns each pending
-- invite into real membership (and links the player row, if any).
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  email text not null,
  role text not null check (role in ('coordinador', 'player', 'dt')) default 'player',
  player_id uuid references public.players on delete cascade,
  created_at timestamptz default now()
);

alter table public.team_invites enable row level security;

drop policy if exists "team_invites_select" on public.team_invites;
create policy "team_invites_select" on public.team_invites for select using (is_team_admin(team_id));
drop policy if exists "team_invites_insert" on public.team_invites;
create policy "team_invites_insert" on public.team_invites for insert with check (is_team_admin(team_id));
drop policy if exists "team_invites_delete" on public.team_invites;
create policy "team_invites_delete" on public.team_invites for delete using (is_team_admin(team_id));

-- Runs on every login (see AuthProvider). Looks up pending invites for the
-- signed-in user's email, turns them into team_members rows, links the
-- player record if one was specified, then clears the invite.
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
end;
$$;
