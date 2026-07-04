import type { FixtureMatch } from '@/types'

// A club's own match, derived from the real fixture (round-robin schedule),
// resolved to "us vs rival" from our team's point of view.
export interface DisplayMatch {
  id: string
  category_id: string
  rival: string
  date: string
  played: boolean
  home_score: number | null
  away_score: number | null
  weWereHome: boolean
  location?: string | null
}

export function ourMatches(fixtureMatches: FixtureMatch[], teamName: string): DisplayMatch[] {
  // The demo's seed fixture uses the short literal 'Maestros' regardless of
  // whatever display name the demo team currently has — match both.
  const isUs = (t: string) => t === teamName || t === 'Maestros'
  return fixtureMatches
    .filter(m => isUs(m.home_team) || isUs(m.away_team))
    .map(m => ({
      id: m.id,
      category_id: m.category_id,
      rival: isUs(m.home_team) ? m.away_team : m.home_team,
      date: m.date,
      played: m.played && m.home_score !== null && m.away_score !== null,
      home_score: m.home_score,
      away_score: m.away_score,
      weWereHome: isUs(m.home_team),
      location: m.location,
    }))
}

export function lastPlayedFor(matches: DisplayMatch[], categoryId: string) {
  return matches
    .filter(m => m.category_id === categoryId && m.played)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
}
export function nextUpcomingFor(matches: DisplayMatch[], categoryId: string) {
  return matches
    .filter(m => m.category_id === categoryId && !m.played)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}
export function ourScore(m: DisplayMatch) {
  return m.weWereHome ? m.home_score : m.away_score
}
export function theirScore(m: DisplayMatch) {
  return m.weWereHome ? m.away_score : m.home_score
}
