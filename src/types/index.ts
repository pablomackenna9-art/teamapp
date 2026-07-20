export type UserRole = 'admin' | 'captain' | 'player' | 'dt' | 'coordinador'
export type MatchType = 'official' | 'friendly'
export type MatchStatus = 'upcoming' | 'played' | 'suspended'
export type AttendanceStatus = 'confirmed' | 'absent' | 'maybe' | 'no_response'
export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'mvp_vote'
export type PostType = 'notice' | 'citation' | 'announcement'
export type Sport = 'football' | 'hockey' | 'basketball' | 'volleyball' | 'other'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  slug: string
  logo_url: string | null
  sponsor_url?: string | null
  league_id?: string | null
  primary_color: string
  secondary_color: string
  sport: Sport
  created_by: string
  created_at: string
}

export interface League {
  id: string
  name: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface Season {
  id: string
  team_id: string
  name: string
  start_date: string
  end_date: string | null
  is_active: boolean
}

export interface Category {
  id: string
  team_id: string
  name: string
  sponsor_url?: string | null
}

export type PlayerResponsibility = 'dt' | 'tesorero' | 'coordinador'

export interface Player {
  id: string
  team_id: string
  user_id: string | null
  name: string
  photo_url: string | null
  position: string | null
  number: number | null
  category_id: string | null
  is_active: boolean
  created_at: string
  responsibility?: PlayerResponsibility | null
  email?: string | null
  nickname?: string | null
  category?: Category
}

export interface Title {
  id: string
  team_id: string
  category_id: string
  tournament: string
  year: number
  created_at: string
}

export interface Match {
  id: string
  team_id: string
  season_id: string | null
  category_id: string | null
  rival: string
  date: string
  location: string | null
  type: MatchType
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  summary: string | null
  cover_photo_url: string | null
  created_at: string
  mvp_voting_closed?: boolean
  category?: Category
  season?: Season
}

export interface MatchEvent {
  id: string
  match_id: string
  player_id: string
  type: EventType
  minute: number | null
  created_by: string
  player?: Player
}

export interface MatchAttendance {
  id: string
  match_id: string
  player_id: string
  status: AttendanceStatus
  updated_at: string
  player?: Player
}

export interface StandingsRival {
  id: string
  team_id: string
  season_id: string | null
  rival_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
}

export interface Photo {
  id: string
  match_id: string | null
  team_id: string
  url: string
  caption: string | null
  uploaded_by: string
  created_at: string
  featured?: boolean
}

export interface Post {
  id: string
  team_id: string
  title: string
  content: string
  type: PostType
  photo_url?: string | null
  category_id?: string | null
  created_by: string
  created_at: string
  author?: Profile
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

// Computed / aggregated types
export interface PlayerStats {
  player_id: string
  player_name: string
  photo_url: string | null
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  mvp_votes: number
  matches_played: number
  attendance_pct: number
}

export interface AttendanceSummary {
  confirmed: number
  absent: number
  maybe: number
  no_response: number
  total: number
}

export interface FixtureMatch {
  id: string
  category_id: string
  round: number
  home_team: string
  away_team: string
  date: string
  home_score: number | null
  away_score: number | null
  played: boolean
  location?: string | null
  formation?: string | null
  lineup?: Record<string, LineupSlot>
}

export interface LineupSlot {
  playerId: string
  dx?: number
  dy?: number
}

export type FixtureEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card'

export interface FixtureMatchEvent {
  id: string
  fixture_match_id: string
  player_id: string
  type: FixtureEventType
  created_at: string
}

export interface FixtureMatchAttendance {
  id: string
  fixture_match_id: string
  player_id: string
  status: AttendanceStatus
  updated_at: string
}

export interface FixtureMatchMvpVote {
  id: string
  fixture_match_id: string
  voter_player_id: string
  target_player_id: string
  updated_at: string
}

export interface MvpVote {
  id: string
  match_id: string
  voter_id: string
  voter_name: string
  player_id: string
  updated_at: string
}

export interface ComputedStanding {
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  gc: number
  points: number
}
