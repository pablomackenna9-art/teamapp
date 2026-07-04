-- ============================================================
-- TeamApp - Atomic team creation (avoids the RLS chicken-and-egg
-- problem entirely: SECURITY DEFINER bypasses the "can't SELECT a
-- team you're not a member of yet" issue by doing everything in
-- one server-side transaction instead of separate client calls).
-- ============================================================

create or replace function public.create_team(
  p_name text,
  p_slug text,
  p_sport text,
  p_primary_color text,
  p_secondary_color text
)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams;
begin
  insert into public.teams (name, slug, sport, primary_color, secondary_color, created_by)
  values (p_name, p_slug, p_sport, p_primary_color, p_secondary_color, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'admin');

  return v_team;
end;
$$;
