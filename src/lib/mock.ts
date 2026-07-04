import type { Team, Player, Match, Post, StandingsRival, PlayerStats, MatchEvent, MatchAttendance, Category, FixtureMatch } from '@/types'

export const mockTeam: Team = {
  id: 'mock-team-1',
  name: 'Maestros FC',
  slug: 'maestros-fc',
  logo_url: null,
  primary_color: '#22c55e',
  secondary_color: '#15803d',
  sport: 'football',
  created_by: 'mock-user-1',
  created_at: new Date().toISOString(),
}

export const mockCategories: Category[] = [
  { id: 'cat-junior', team_id: 'mock-team-1', name: 'Junior' },
  { id: 'cat-senior', team_id: 'mock-team-1', name: 'Senior' },
  { id: 'cat-futbolito', team_id: 'mock-team-1', name: 'SS Futbolito' },
  { id: 'cat-futbol', team_id: 'mock-team-1', name: 'SS Fútbol' },
]

export const mockPlayers: Player[] = [
  { id: 'p1', team_id: 'mock-team-1', user_id: null, name: 'Lucas Rodríguez', photo_url: null, position: 'Arquero', number: 1, category_id: 'cat-junior', is_active: true, created_at: '' },
  { id: 'p2', team_id: 'mock-team-1', user_id: null, name: 'Matías González', photo_url: null, position: 'Defensor', number: 4, category_id: 'cat-junior', is_active: true, created_at: '' },
  { id: 'p3', team_id: 'mock-team-1', user_id: null, name: 'Diego Fernández', photo_url: null, position: 'Defensor', number: 5, category_id: 'cat-junior', is_active: true, created_at: '' },
  { id: 'p4', team_id: 'mock-team-1', user_id: null, name: 'Sebastián López', photo_url: null, position: 'Mediocampista', number: 8, category_id: 'cat-senior', is_active: true, created_at: '' },
  { id: 'p5', team_id: 'mock-team-1', user_id: null, name: 'Pablo Martínez', photo_url: null, position: 'Mediocampista', number: 10, category_id: 'cat-senior', is_active: true, created_at: '' },
  { id: 'p6', team_id: 'mock-team-1', user_id: null, name: 'Nicolás García', photo_url: null, position: 'Delantero', number: 9, category_id: 'cat-senior', is_active: true, created_at: '' },
  { id: 'p7', team_id: 'mock-team-1', user_id: null, name: 'Andrés Torres', photo_url: null, position: 'Delantero', number: 11, category_id: 'cat-futbolito', is_active: true, created_at: '' },
  { id: 'p8', team_id: 'mock-team-1', user_id: null, name: 'Carlos Herrera', photo_url: null, position: 'Defensor', number: 3, category_id: 'cat-futbol', is_active: true, created_at: '' },
  { id: 'p9', team_id: 'mock-team-1', user_id: null, name: 'Rodrigo Peña', photo_url: null, position: 'Arquero', number: 12, category_id: 'cat-senior', is_active: true, created_at: '' },
  { id: 'p10', team_id: 'mock-team-1', user_id: null, name: 'Fernando Díaz', photo_url: null, position: 'Defensor', number: 6, category_id: 'cat-junior', is_active: true, created_at: '' },
]

export const mockMatches: Match[] = [
  {
    id: 'm1', team_id: 'mock-team-1', season_id: null, category_id: 'cat-junior',
    rival: 'Cuervo (JR)', date: new Date(Date.now() + 3 * 86400000).toISOString(),
    location: 'Cancha Municipal', type: 'official', status: 'upcoming',
    home_score: null, away_score: null, summary: null, cover_photo_url: null, created_at: '',
  },
  {
    id: 'm2', team_id: 'mock-team-1', season_id: null, category_id: 'cat-junior',
    rival: 'Verbo', date: new Date(Date.now() - 14 * 86400000).toISOString(),
    location: 'Estadio Sur', type: 'official', status: 'played',
    home_score: 1, away_score: 3, summary: 'Partido difícil, el rival fue superior.', cover_photo_url: null, created_at: '',
  },
  {
    id: 'm3', team_id: 'mock-team-1', season_id: null, category_id: 'cat-senior',
    rival: 'Tigres United', date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: 'Estadio Norte', type: 'official', status: 'upcoming',
    home_score: null, away_score: null, summary: null, cover_photo_url: null, created_at: '',
  },
  {
    id: 'm4', team_id: 'mock-team-1', season_id: null, category_id: 'cat-senior',
    rival: 'Leones SC', date: new Date(Date.now() - 7 * 86400000).toISOString(),
    location: 'Cancha Norte', type: 'official', status: 'played',
    home_score: 3, away_score: 1, summary: 'Gran partido. Dominio total en el segundo tiempo.', cover_photo_url: null, created_at: '',
  },
  {
    id: 'm5', team_id: 'mock-team-1', season_id: null, category_id: 'cat-futbolito',
    rival: 'Pumas Futbolito', date: new Date(Date.now() + 10 * 86400000).toISOString(),
    location: 'Estadio Central', type: 'official', status: 'upcoming',
    home_score: null, away_score: null, summary: null, cover_photo_url: null, created_at: '',
  },
  {
    id: 'm6', team_id: 'mock-team-1', season_id: null, category_id: 'cat-futbolito',
    rival: 'Águilas CF', date: new Date(Date.now() - 21 * 86400000).toISOString(),
    location: 'Estadio Central', type: 'friendly', status: 'played',
    home_score: 2, away_score: 0, summary: null, cover_photo_url: null, created_at: '',
  },
]

export const mockMatchEvents: MatchEvent[] = [
  { id: 'e1', match_id: 'm4', player_id: 'p6', type: 'goal', minute: 23, created_by: 'mock-user-1', player: mockPlayers[5] },
  { id: 'e2', match_id: 'm4', player_id: 'p5', type: 'assist', minute: 23, created_by: 'mock-user-1', player: mockPlayers[4] },
  { id: 'e3', match_id: 'm4', player_id: 'p6', type: 'goal', minute: 61, created_by: 'mock-user-1', player: mockPlayers[5] },
  { id: 'e4', match_id: 'm4', player_id: 'p4', type: 'yellow_card', minute: 44, created_by: 'mock-user-1', player: mockPlayers[3] },
]

export const mockAttendance: MatchAttendance[] = mockPlayers.slice(0, 6).map((p, i) => ({
  id: `a${i}`, match_id: 'm1', player_id: p.id,
  status: i < 4 ? 'confirmed' : i < 5 ? 'maybe' : 'no_response',
  updated_at: new Date().toISOString(),
  player: p,
}))

// Standings per category
export const mockStandingsByCategory: Record<string, StandingsRival[]> = {
  'cat-junior': [
    { id: 'sj1', team_id: 'mock-team-1', season_id: null, rival_name: 'Maestros', played: 9, won: 6, drawn: 1, lost: 2, goals_for: 18, goals_against: 10, points: 19 },
    { id: 'sj2', team_id: 'mock-team-1', season_id: null, rival_name: 'Cuervo JR', played: 9, won: 5, drawn: 2, lost: 2, goals_for: 16, goals_against: 12, points: 17 },
    { id: 'sj3', team_id: 'mock-team-1', season_id: null, rival_name: 'Verbo', played: 9, won: 4, drawn: 1, lost: 4, goals_for: 13, goals_against: 14, points: 13 },
    { id: 'sj4', team_id: 'mock-team-1', season_id: null, rival_name: 'Pumas JR', played: 9, won: 2, drawn: 2, lost: 5, goals_for: 9, goals_against: 16, points: 8 },
    { id: 'sj5', team_id: 'mock-team-1', season_id: null, rival_name: 'Leones JR', played: 9, won: 1, drawn: 2, lost: 6, goals_for: 7, goals_against: 20, points: 5 },
  ],
  'cat-senior': [
    { id: 'ss1', team_id: 'mock-team-1', season_id: null, rival_name: 'Maestros', played: 13, won: 7, drawn: 4, lost: 2, goals_for: 26, goals_against: 15, points: 25 },
    { id: 'ss2', team_id: 'mock-team-1', season_id: null, rival_name: 'Los Pumas FC', played: 13, won: 6, drawn: 3, lost: 4, goals_for: 22, goals_against: 18, points: 21 },
    { id: 'ss3', team_id: 'mock-team-1', season_id: null, rival_name: 'Tigres United', played: 13, won: 5, drawn: 4, lost: 4, goals_for: 19, goals_against: 19, points: 19 },
    { id: 'ss4', team_id: 'mock-team-1', season_id: null, rival_name: 'Leones SC', played: 13, won: 4, drawn: 3, lost: 6, goals_for: 15, goals_against: 21, points: 15 },
    { id: 'ss5', team_id: 'mock-team-1', season_id: null, rival_name: 'Verbo', played: 13, won: 2, drawn: 2, lost: 9, goals_for: 10, goals_against: 28, points: 8 },
  ],
  'cat-futbolito': [
    { id: 'sf1', team_id: 'mock-team-1', season_id: null, rival_name: 'Maestros', played: 8, won: 5, drawn: 2, lost: 1, goals_for: 22, goals_against: 8, points: 17 },
    { id: 'sf2', team_id: 'mock-team-1', season_id: null, rival_name: 'Águilas CF', played: 8, won: 4, drawn: 1, lost: 3, goals_for: 15, goals_against: 12, points: 13 },
    { id: 'sf3', team_id: 'mock-team-1', season_id: null, rival_name: 'Pumas Futbolito', played: 8, won: 2, drawn: 3, lost: 3, goals_for: 11, goals_against: 14, points: 9 },
    { id: 'sf4', team_id: 'mock-team-1', season_id: null, rival_name: 'Cóndores', played: 8, won: 1, drawn: 2, lost: 5, goals_for: 7, goals_against: 21, points: 5 },
  ],
  'cat-futbol': [
    { id: 'sfs1', team_id: 'mock-team-1', season_id: null, rival_name: 'Maestros', played: 6, won: 3, drawn: 1, lost: 2, goals_for: 12, goals_against: 9, points: 10 },
    { id: 'sfs2', team_id: 'mock-team-1', season_id: null, rival_name: 'Rivales FC', played: 6, won: 3, drawn: 0, lost: 3, goals_for: 10, goals_against: 10, points: 9 },
    { id: 'sfs3', team_id: 'mock-team-1', season_id: null, rival_name: 'Altas Cumbres', played: 6, won: 1, drawn: 2, lost: 3, goals_for: 7, goals_against: 12, points: 5 },
  ],
}

// General standings (all categories combined, for home view)
export const mockStandings = mockStandingsByCategory['cat-senior']

export const mockStats: PlayerStats[] = [
  { player_id: 'p6', player_name: 'Nicolás García', photo_url: null, goals: 8, assists: 2, yellow_cards: 0, red_cards: 0, mvp_votes: 3, matches_played: 7, attendance_pct: 100 },
  { player_id: 'p7', player_name: 'Andrés Torres', photo_url: null, goals: 5, assists: 3, yellow_cards: 1, red_cards: 0, mvp_votes: 2, matches_played: 6, attendance_pct: 85 },
  { player_id: 'p5', player_name: 'Pablo Martínez', photo_url: null, goals: 3, assists: 6, yellow_cards: 0, red_cards: 0, mvp_votes: 2, matches_played: 7, attendance_pct: 100 },
  { player_id: 'p4', player_name: 'Sebastián López', photo_url: null, goals: 1, assists: 2, yellow_cards: 3, red_cards: 0, mvp_votes: 0, matches_played: 7, attendance_pct: 100 },
  { player_id: 'p2', player_name: 'Matías González', photo_url: null, goals: 2, assists: 1, yellow_cards: 1, red_cards: 0, mvp_votes: 1, matches_played: 5, attendance_pct: 71 },
  { player_id: 'p1', player_name: 'Lucas Rodríguez', photo_url: null, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, mvp_votes: 1, matches_played: 6, attendance_pct: 85 },
]

export interface MockTitle {
  id: string
  category_id: string
  tournament: string
  year: number
}

export const mockTitles: MockTitle[] = [
  { id: 't1', category_id: 'cat-junior', tournament: 'Clausura', year: 2009 },
  { id: 't2', category_id: 'cat-junior', tournament: 'Apertura', year: 2011 },
  { id: 't3', category_id: 'cat-junior', tournament: 'Clausura', year: 2012 },
  { id: 't4', category_id: 'cat-junior', tournament: 'Clausura', year: 2013 },
  { id: 't5', category_id: 'cat-junior', tournament: 'Apertura', year: 2014 },
  { id: 't6', category_id: 'cat-junior', tournament: 'Apertura', year: 2016 },
  { id: 't7', category_id: 'cat-junior', tournament: 'Clausura', year: 2018 },
  { id: 't8', category_id: 'cat-junior', tournament: 'Apertura', year: 2021 },
  { id: 't9', category_id: 'cat-junior', tournament: 'Clausura', year: 2023 },
  { id: 't10', category_id: 'cat-futbolito', tournament: 'Apertura', year: 2015 },
  { id: 't11', category_id: 'cat-futbolito', tournament: 'Clausura', year: 2017 },
  { id: 't12', category_id: 'cat-futbolito', tournament: 'Apertura', year: 2020 },
  { id: 't13', category_id: 'cat-futbolito', tournament: 'Clausura', year: 2022 },
  { id: 't14', category_id: 'cat-futbol', tournament: 'Clausura', year: 2010 },
  { id: 't15', category_id: 'cat-futbol', tournament: 'Apertura', year: 2019 },
  { id: 't16', category_id: 'cat-futbol', tournament: 'Clausura', year: 2024 },
  { id: 't17', category_id: 'cat-futbol', tournament: 'Apertura', year: 2025 },
  { id: 't18', category_id: 'cat-senior', tournament: 'Clausura', year: 2008 },
  { id: 't19', category_id: 'cat-senior', tournament: 'Apertura', year: 2017 },
]

export const mockPosts: Post[] = [
  { id: 'post1', team_id: 'mock-team-1', title: 'Convocatoria — Partido del sábado', content: 'Se citan todos los jugadores el sábado a las 9:00 hs en la cancha municipal. Llevar botines, canilleras y agua.', type: 'citation', created_by: 'mock-user-1', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'post2', team_id: 'mock-team-1', title: 'Cuota del mes — vence el 30', content: 'Recordamos que la cuota del mes vence el día 30. Por favor abonar a tesorería antes del partido.', type: 'notice', created_by: 'mock-user-1', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'post3', team_id: 'mock-team-1', title: '¡Clasificados a la segunda fase!', content: 'Gracias al triunfo del último fin de semana, clasificamos a la segunda fase del torneo. ¡Seguimos juntos!', type: 'announcement', created_by: 'mock-user-1', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
]

// ── Fixture data (all league matches, including rival vs rival) ───────────────
function d(daysOffset: number) {
  return new Date(Date.now() + daysOffset * 86400000).toISOString()
}

export const mockFixture: FixtureMatch[] = [
  // JUNIOR — Jornada 1
  { id: 'fj1-1', category_id: 'cat-junior', round: 1, home_team: 'Maestros', away_team: 'Cuervo JR', date: d(-35), home_score: 2, away_score: 1, played: true },
  { id: 'fj1-2', category_id: 'cat-junior', round: 1, home_team: 'Verbo', away_team: 'Pumas JR', date: d(-35), home_score: 0, away_score: 0, played: true },
  { id: 'fj1-3', category_id: 'cat-junior', round: 1, home_team: 'Leones JR', away_team: 'Maestros', date: d(-35), home_score: 1, away_score: 3, played: true },
  // JUNIOR — Jornada 2
  { id: 'fj2-1', category_id: 'cat-junior', round: 2, home_team: 'Cuervo JR', away_team: 'Verbo', date: d(-21), home_score: 2, away_score: 2, played: true },
  { id: 'fj2-2', category_id: 'cat-junior', round: 2, home_team: 'Maestros', away_team: 'Pumas JR', date: d(-21), home_score: 4, away_score: 0, played: true },
  { id: 'fj2-3', category_id: 'cat-junior', round: 2, home_team: 'Leones JR', away_team: 'Verbo', date: d(-21), home_score: 1, away_score: 3, played: true },
  // JUNIOR — Jornada 3
  { id: 'fj3-1', category_id: 'cat-junior', round: 3, home_team: 'Verbo', away_team: 'Maestros', date: d(-14), home_score: 3, away_score: 1, played: true },
  { id: 'fj3-2', category_id: 'cat-junior', round: 3, home_team: 'Pumas JR', away_team: 'Cuervo JR', date: d(-14), home_score: 1, away_score: 2, played: true },
  { id: 'fj3-3', category_id: 'cat-junior', round: 3, home_team: 'Maestros', away_team: 'Leones JR', date: d(-14), home_score: 2, away_score: 0, played: true },
  // JUNIOR — Jornada 4 (proxima)
  { id: 'fj4-1', category_id: 'cat-junior', round: 4, home_team: 'Maestros', away_team: 'Verbo', date: d(3), home_score: null, away_score: null, played: false },
  { id: 'fj4-2', category_id: 'cat-junior', round: 4, home_team: 'Cuervo JR', away_team: 'Leones JR', date: d(3), home_score: null, away_score: null, played: false },
  { id: 'fj4-3', category_id: 'cat-junior', round: 4, home_team: 'Pumas JR', away_team: 'Leones JR', date: d(4), home_score: null, away_score: null, played: false },
  // SENIOR — Jornada 1
  { id: 'fs1-1', category_id: 'cat-senior', round: 1, home_team: 'Maestros', away_team: 'Los Pumas FC', date: d(-28), home_score: 2, away_score: 0, played: true },
  { id: 'fs1-2', category_id: 'cat-senior', round: 1, home_team: 'Tigres United', away_team: 'Leones SC', date: d(-28), home_score: 1, away_score: 1, played: true },
  { id: 'fs1-3', category_id: 'cat-senior', round: 1, home_team: 'Verbo', away_team: 'Maestros', date: d(-28), home_score: 0, away_score: 2, played: true },
  // SENIOR — Jornada 2
  { id: 'fs2-1', category_id: 'cat-senior', round: 2, home_team: 'Leones SC', away_team: 'Maestros', date: d(-14), home_score: 1, away_score: 3, played: true },
  { id: 'fs2-2', category_id: 'cat-senior', round: 2, home_team: 'Los Pumas FC', away_team: 'Tigres United', date: d(-14), home_score: 2, away_score: 1, played: true },
  { id: 'fs2-3', category_id: 'cat-senior', round: 2, home_team: 'Maestros', away_team: 'Verbo', date: d(-7), home_score: 3, away_score: 0, played: true },
  // SENIOR — Jornada 3 (proxima)
  { id: 'fs3-1', category_id: 'cat-senior', round: 3, home_team: 'Tigres United', away_team: 'Maestros', date: d(7), home_score: null, away_score: null, played: false },
  { id: 'fs3-2', category_id: 'cat-senior', round: 3, home_team: 'Leones SC', away_team: 'Los Pumas FC', date: d(7), home_score: null, away_score: null, played: false },
  { id: 'fs3-3', category_id: 'cat-senior', round: 3, home_team: 'Verbo', away_team: 'Tigres United', date: d(8), home_score: null, away_score: null, played: false },
  // SS FUTBOLITO — Jornada 1
  { id: 'ff1-1', category_id: 'cat-futbolito', round: 1, home_team: 'Maestros', away_team: 'Aguilas CF', date: d(-21), home_score: 2, away_score: 0, played: true },
  { id: 'ff1-2', category_id: 'cat-futbolito', round: 1, home_team: 'Pumas Futbolito', away_team: 'Condores', date: d(-21), home_score: 3, away_score: 1, played: true },
  // SS FUTBOLITO — Jornada 2
  { id: 'ff2-1', category_id: 'cat-futbolito', round: 2, home_team: 'Condores', away_team: 'Maestros', date: d(-7), home_score: 0, away_score: 3, played: true },
  { id: 'ff2-2', category_id: 'cat-futbolito', round: 2, home_team: 'Aguilas CF', away_team: 'Pumas Futbolito', date: d(-7), home_score: 1, away_score: 2, played: true },
  // SS FUTBOLITO — Jornada 3 (proxima)
  { id: 'ff3-1', category_id: 'cat-futbolito', round: 3, home_team: 'Maestros', away_team: 'Pumas Futbolito', date: d(10), home_score: null, away_score: null, played: false },
  { id: 'ff3-2', category_id: 'cat-futbolito', round: 3, home_team: 'Aguilas CF', away_team: 'Condores', date: d(10), home_score: null, away_score: null, played: false },
  // SS FUTBOL — Jornada 1
  { id: 'fb1-1', category_id: 'cat-futbol', round: 1, home_team: 'Maestros', away_team: 'Rivales FC', date: d(-14), home_score: 2, away_score: 1, played: true },
  { id: 'fb1-2', category_id: 'cat-futbol', round: 1, home_team: 'Altas Cumbres', away_team: 'Rivales FC', date: d(-14), home_score: 0, away_score: 1, played: true },
  // SS FUTBOL — Jornada 2 (proxima)
  { id: 'fb2-1', category_id: 'cat-futbol', round: 2, home_team: 'Rivales FC', away_team: 'Altas Cumbres', date: d(5), home_score: null, away_score: null, played: false },
  { id: 'fb2-2', category_id: 'cat-futbol', round: 2, home_team: 'Maestros', away_team: 'Altas Cumbres', date: d(6), home_score: null, away_score: null, played: false },
]

export const mockPointsPerWin: Record<string, 2 | 3> = {
  'cat-junior': 3,
  'cat-senior': 3,
  'cat-futbolito': 3,
  'cat-futbol': 3,
}
