import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mockCategories, mockFixture, mockPointsPerWin, mockPlayers, mockPosts, mockTeam, mockTitles } from '@/lib/mock'
import type { Category, FixtureMatch, MatchType, Player, PlayerResponsibility, Post, AttendanceStatus } from '@/types'
import type { MockTitle } from '@/lib/mock'
import sponsorGatorade from '@/assets/sponsor-gatorade.jpg'

export const MAX_EXTRA_COORDINADORES = 2

interface MatchOverride {
  rival?: string
  type?: MatchType
  date?: string
  location?: string
}

interface DemoState {
  teamName: string
  teamLogoUrl: string | null
  categories: Category[]
  players: Player[]
  fixtureMatches: FixtureMatch[]
  pointsPerWin: Record<string, 2 | 3>
  posts: Post[]
  titles: MockTitle[]
  mvpVotesByMatch: Record<string, Record<string, string>>
  votingClosedByMatch: Record<string, boolean>
  matchOverrides: Record<string, MatchOverride>
  sponsors: string[]
  activeSponsor: string | null
  attendanceByMatch: Record<string, Record<string, AttendanceStatus>>

  setTeamName: (name: string) => void
  setTeamLogo: (url: string | null) => void
  addCategory: (category: Category) => void
  renameCategory: (id: string, name: string) => void
  addPlayer: (player: Player) => void
  addPlayers: (players: Player[]) => void
  updatePlayerPhoto: (id: string, url: string) => void
  setMatchResult: (matchId: string, homeScore: number, awayScore: number) => void
  addFixtureMatches: (matches: FixtureMatch[]) => void
  setPointsPerWin: (categoryId: string, pts: 2 | 3) => void
  addPost: (post: Post) => void
  setMvpVote: (matchId: string, voterId: string, playerId: string) => void
  setVotingClosed: (matchId: string, closed: boolean) => void
  setMatchOverride: (matchId: string, patch: MatchOverride) => void
  addSponsor: (url: string) => void
  removeSponsor: (index: number) => void
  setActiveSponsor: (url: string | null) => void
  setAttendance: (matchId: string, playerId: string, status: AttendanceStatus) => void
  setPlayerResponsibility: (playerId: string, responsibility: PlayerResponsibility | null) => { ok: boolean; error?: string }
  setPlayerEmail: (playerId: string, email: string | null) => void
  addTitle: (title: MockTitle) => void
  removeTitle: (id: string) => void
  resetDemo: () => void
}

const seed = {
  teamName: mockTeam.name,
  teamLogoUrl: mockTeam.logo_url,
  categories: mockCategories,
  players: mockPlayers,
  fixtureMatches: mockFixture,
  pointsPerWin: mockPointsPerWin,
  posts: mockPosts,
  titles: mockTitles,
  mvpVotesByMatch: {} as Record<string, Record<string, string>>,
  votingClosedByMatch: {} as Record<string, boolean>,
  matchOverrides: {} as Record<string, MatchOverride>,
  sponsors: [sponsorGatorade] as string[],
  activeSponsor: sponsorGatorade as string | null,
  attendanceByMatch: {} as Record<string, Record<string, AttendanceStatus>>,
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...seed,

      setTeamName: (name) => set({ teamName: name }),
      setTeamLogo: (url) => set({ teamLogoUrl: url }),

      addCategory: (category) => set(state => ({ categories: [...state.categories, category] })),
      renameCategory: (id, name) => set(state => ({
        categories: state.categories.map(c => c.id === id ? { ...c, name } : c),
      })),

      addPlayer: (player) => set(state => ({ players: [...state.players, player] })),
      addPlayers: (players) => set(state => ({ players: [...state.players, ...players] })),
      updatePlayerPhoto: (id, url) => set(state => ({
        players: state.players.map(p => p.id === id ? { ...p, photo_url: url } : p),
      })),

      setMatchResult: (matchId, homeScore, awayScore) => set(state => ({
        fixtureMatches: state.fixtureMatches.map(m =>
          m.id === matchId ? { ...m, home_score: homeScore, away_score: awayScore, played: true } : m
        ),
      })),
      addFixtureMatches: (matches) => set(state => ({
        fixtureMatches: [...state.fixtureMatches, ...matches],
      })),
      setPointsPerWin: (categoryId, pts) => set(state => ({
        pointsPerWin: { ...state.pointsPerWin, [categoryId]: pts },
      })),

      addPost: (post) => set(state => ({ posts: [post, ...state.posts] })),

      setMvpVote: (matchId, voterId, playerId) => set(state => ({
        mvpVotesByMatch: {
          ...state.mvpVotesByMatch,
          [matchId]: { ...(state.mvpVotesByMatch[matchId] ?? {}), [voterId]: playerId },
        },
      })),
      setVotingClosed: (matchId, closed) => set(state => ({
        votingClosedByMatch: { ...state.votingClosedByMatch, [matchId]: closed },
      })),

      setMatchOverride: (matchId, patch) => set(state => ({
        matchOverrides: { ...state.matchOverrides, [matchId]: { ...(state.matchOverrides[matchId] ?? {}), ...patch } },
      })),

      addSponsor: (url) => set(state => ({ sponsors: [...state.sponsors, url] })),
      removeSponsor: (index) => set(state => {
        const removed = state.sponsors[index]
        return {
          sponsors: state.sponsors.filter((_, i) => i !== index),
          activeSponsor: state.activeSponsor === removed ? null : state.activeSponsor,
        }
      }),
      setActiveSponsor: (url) => set({ activeSponsor: url }),

      setAttendance: (matchId, playerId, status) => set(state => ({
        attendanceByMatch: {
          ...state.attendanceByMatch,
          [matchId]: { ...(state.attendanceByMatch[matchId] ?? {}), [playerId]: status },
        },
      })),

      setPlayerResponsibility: (playerId, responsibility) => {
        const state = get()
        if (responsibility === 'coordinador') {
          const currentCount = state.players.filter(
            p => p.responsibility === 'coordinador' && p.id !== playerId
          ).length
          if (currentCount >= MAX_EXTRA_COORDINADORES) {
            return { ok: false, error: `Ya asignaste el máximo de ${MAX_EXTRA_COORDINADORES} coordinadores extra` }
          }
        }
        set({
          players: state.players.map(p => p.id === playerId ? { ...p, responsibility } : p),
        })
        return { ok: true }
      },

      setPlayerEmail: (playerId, email) => set(state => ({
        players: state.players.map(p => p.id === playerId ? { ...p, email } : p),
      })),

      addTitle: (title) => set(state => ({ titles: [...state.titles, title] })),
      removeTitle: (id) => set(state => ({ titles: state.titles.filter(t => t.id !== id) })),

      resetDemo: () => set(seed),
    }),
    { name: 'teamapp-demo-data' }
  )
)
