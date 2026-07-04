import type { FixtureMatch, ComputedStanding } from '@/types'

export function calculateStandings(
  fixtureMatches: FixtureMatch[],
  categoryId: string,
  pointsPerWin: 2 | 3,
): ComputedStanding[] {
  const teams: Record<string, ComputedStanding> = {}

  function get(name: string): ComputedStanding {
    if (!teams[name]) {
      teams[name] = { name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, gc: 0, points: 0 }
    }
    return teams[name]
  }

  const played = fixtureMatches.filter(
    m => m.category_id === categoryId && m.played && m.home_score !== null && m.away_score !== null
  )

  for (const match of played) {
    const hs = match.home_score!
    const as = match.away_score!
    const home = get(match.home_team)
    const away = get(match.away_team)

    home.played++; away.played++
    home.gf += hs; home.gc += as
    away.gf += as; away.gc += hs

    if (hs > as) {
      home.won++; away.lost++
      home.points += pointsPerWin
    } else if (hs < as) {
      away.won++; home.lost++
      away.points += pointsPerWin
    } else {
      home.drawn++; away.drawn++
      home.points += 1; away.points += 1
    }
  }

  return Object.values(teams).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const dgA = a.gf - a.gc
    const dgB = b.gf - b.gc
    if (dgB !== dgA) return dgB - dgA
    return b.gf - a.gf
  })
}
