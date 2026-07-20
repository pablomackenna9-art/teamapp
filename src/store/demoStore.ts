import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mockCategories, mockFixture, mockPointsPerWin, mockPlayers, mockPosts, mockTeam, mockTitles } from '@/lib/mock'
import type { Category, FixtureMatch, Player, PlayerResponsibility, Post, AttendanceStatus, FixtureEventType, Photo } from '@/types'
import type { MockTitle } from '@/lib/mock'
import sponsorGatorade from '@/assets/sponsor-gatorade.jpg'

export const MAX_EXTRA_COORDINADORES = 2

export interface DemoMatchEvent {
  id: string
  player_id: string
  type: FixtureEventType
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
  sponsors: string[]
  activeSponsor: string | null
  attendanceByMatch: Record<string, Record<string, AttendanceStatus>>
  matchEventsByMatch: Record<string, DemoMatchEvent[]>
  postLikeCounts: Record<string, number>
  myLikedPostIds: string[]
  photos: Photo[]

  setTeamName: (name: string) => void
  setTeamLogo: (url: string | null) => void
  addCategory: (category: Category) => void
  renameCategory: (id: string, name: string) => void
  setCategorySponsor: (id: string, url: string | null) => void
  addPlayer: (player: Player) => void
  addPlayers: (players: Player[]) => void
  updatePlayerPhoto: (id: string, url: string) => void
  setMatchResult: (matchId: string, homeScore: number, awayScore: number) => void
  addFixtureMatches: (matches: FixtureMatch[]) => void
  setPointsPerWin: (categoryId: string, pts: 2 | 3) => void
  addPost: (post: Post) => void
  setMvpVote: (matchId: string, voterId: string, playerId: string) => void
  setVotingClosed: (matchId: string, closed: boolean) => void
  addSponsor: (url: string) => void
  removeSponsor: (index: number) => void
  setActiveSponsor: (url: string | null) => void
  setAttendance: (matchId: string, playerId: string, status: AttendanceStatus) => void
  setPlayerResponsibility: (playerId: string, responsibility: PlayerResponsibility | null) => { ok: boolean; error?: string }
  setPlayerEmail: (playerId: string, email: string | null) => void
  addTitle: (title: MockTitle) => void
  removeTitle: (id: string) => void
  addMatchEvent: (matchId: string, playerId: string, type: FixtureEventType) => void
  removeMatchEvent: (matchId: string, eventId: string) => void
  toggleLike: (postId: string) => void
  addPhoto: (photo: Photo) => void
  toggleFeaturedPhoto: (id: string) => void
  removePhoto: (id: string) => void
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
  sponsors: [sponsorGatorade] as string[],
  activeSponsor: sponsorGatorade as string | null,
  attendanceByMatch: {} as Record<string, Record<string, AttendanceStatus>>,
  matchEventsByMatch: {} as Record<string, DemoMatchEvent[]>,
  postLikeCounts: {} as Record<string, number>,
  myLikedPostIds: [] as string[],
  photos: [
    '1574629810360-7efbbe195018', '1517927033932-b3d18e61fb3a', '1522778119026-d647f0596c20',
    '1543326727-cf6c39e8f84c', '1552667466-07770ae110d0', '1553778263-73a83bab9b0c',
    '1579952363873-27f3bade9f55', '1560272564-c83b66b1ad12', '1614632537197-38a17061c2bd',
  ].map((id, i) => ({
    id: `demo-ph-${i}`,
    team_id: 'mock-team-1',
    match_id: null,
    url: `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`,
    caption: `Foto ${i + 1}`,
    uploaded_by: 'mock-user-1',
    created_at: new Date().toISOString(),
    featured: i < 3,
  })) as Photo[],
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
      setCategorySponsor: (id, url) => set(state => ({
        categories: state.categories.map(c => c.id === id ? { ...c, sponsor_url: url } : c),
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

      addMatchEvent: (matchId, playerId, type) => set(state => ({
        matchEventsByMatch: {
          ...state.matchEventsByMatch,
          [matchId]: [...(state.matchEventsByMatch[matchId] ?? []), { id: `evt-${Date.now()}`, player_id: playerId, type }],
        },
      })),
      removeMatchEvent: (matchId, eventId) => set(state => ({
        matchEventsByMatch: {
          ...state.matchEventsByMatch,
          [matchId]: (state.matchEventsByMatch[matchId] ?? []).filter(e => e.id !== eventId),
        },
      })),
      toggleLike: (postId) => set(state => {
        const liked = state.myLikedPostIds.includes(postId)
        const current = state.postLikeCounts[postId] ?? 0
        return {
          myLikedPostIds: liked ? state.myLikedPostIds.filter(id => id !== postId) : [...state.myLikedPostIds, postId],
          postLikeCounts: { ...state.postLikeCounts, [postId]: Math.max(0, current + (liked ? -1 : 1)) },
        }
      }),

      addPhoto: (photo) => set(state => ({ photos: [photo, ...state.photos] })),
      toggleFeaturedPhoto: (id) => set(state => ({
        photos: state.photos.map(p => p.id === id ? { ...p, featured: !p.featured } : p),
      })),
      removePhoto: (id) => set(state => ({ photos: state.photos.filter(p => p.id !== id) })),

      resetDemo: () => set(seed),
    }),
    {
      name: 'teamapp-demo-data',
      // Bump this whenever the seed content changes (new demo photos, sponsor,
      // etc.) so every browser picks up the fresh baseline instead of staying
      // stuck on whatever it happened to persist locally before.
      version: 2,
      migrate: () => seed,
    }
  )
)
