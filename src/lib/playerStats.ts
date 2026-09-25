import { supabase } from '@/lib/supabase'

export interface PlayerStatRow {
  player_id: string
  player_name: string
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  mvp_votes: number
  matches_played: number
}

// Real per-player stats, computed from fixture_match_events (goals/assists/
// cards) and fixture_match_mvp_votes — the tables real clubs actually write
// to (the legacy `matches`/`mvp_votes` tables were never wired up). Scoped
// to one team so it's cheap to call from a club's own pages.
export async function loadTeamPlayerStats(teamId: string): Promise<Map<string, PlayerStatRow>> {
  const [{ data: players }, { data: events }, { data: votes }, { data: attendance }] = await Promise.all([
    supabase.from('players').select('id, name').eq('team_id', teamId),
    supabase.from('fixture_match_events').select('player_id, type').eq('team_id', teamId),
    supabase.from('fixture_match_mvp_votes').select('target_player_id').eq('team_id', teamId),
    // "Partidos jugados" = matches that were actually played AND this player
    // confirmed attendance for — the closest real signal we have; we never
    // just count every team match, since we can't know who actually played.
    supabase
      .from('fixture_match_attendance')
      .select('player_id, fixture_match_id, status, fixture_matches!inner(played)')
      .eq('team_id', teamId)
      .eq('status', 'confirmed')
      .eq('fixture_matches.played', true),
  ])

  const stats = new Map<string, PlayerStatRow>()
  for (const p of players ?? []) {
    stats.set(p.id, { player_id: p.id, player_name: p.name, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, mvp_votes: 0, matches_played: 0 })
  }

  for (const e of events ?? []) {
    const row = stats.get(e.player_id)
    if (!row) continue
    if (e.type === 'goal') row.goals++
    else if (e.type === 'assist') row.assists++
    else if (e.type === 'yellow_card') row.yellow_cards++
    else if (e.type === 'red_card') row.red_cards++
  }

  for (const v of votes ?? []) {
    const row = stats.get(v.target_player_id)
    if (row) row.mvp_votes++
  }

  for (const a of attendance ?? []) {
    const row = stats.get(a.player_id)
    if (row) row.matches_played++
  }

  return stats
}
