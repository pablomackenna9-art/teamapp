import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole, Category, FixtureMatch, Title } from '@/types'
import { useDemoStore } from '@/store/demoStore'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))

export type ViewMode = 'home' | 'category'

function isMockTeamId(id: string | null) {
  return !id || id === 'mock-team-1'
}

interface TeamState {
  currentTeamSlug: string | null
  currentTeamId: string | null
  memberRole: UserRole | null
  teamColor: string
  teamLogoUrl: string | null
  teamSponsorUrl: string | null
  teamName: string
  categories: Category[]
  activeCategoryId: string | null
  viewMode: ViewMode
  fixtureMatches: FixtureMatch[]
  pointsPerWin: Record<string, 2 | 3>
  titles: Title[]
  isPlatformAdminPreview: boolean
  setCurrentTeam: (slug: string, id: string, role: UserRole, color: string, logoUrl?: string | null, name?: string, sponsorUrl?: string | null) => void
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  setActiveCategory: (categoryId: string) => void
  setViewMode: (mode: ViewMode) => void
  setTeamLogo: (url: string | null) => void
  setTeamSponsor: (url: string | null) => void
  renameCategory: (id: string, name: string) => void
  setMatchResult: (matchId: string, homeScore: number, awayScore: number) => void
  setPointsPerWin: (categoryId: string, pts: 2 | 3) => void
  addFixtureMatches: (matches: FixtureMatch[]) => void
  updateFixtureMatch: (matchId: string, patch: Partial<Pick<FixtureMatch, 'home_team' | 'away_team' | 'date' | 'location' | 'formation' | 'lineup'>>) => void
  addTitle: (categoryId: string, tournament: string, year: number) => Promise<void>
  removeTitle: (id: string) => Promise<void>
  setDemoPreviewRole: (role: UserRole, platformAdminPreview?: boolean) => void
  clearTeam: () => void
}

export const useTeamStore = create<TeamState>((set, get) => ({
  currentTeamSlug: null,
  currentTeamId: null,
  memberRole: null,
  teamColor: '#22c55e',
  teamLogoUrl: null,
  teamSponsorUrl: null,
  teamName: '',
  categories: [],
  activeCategoryId: null,
  viewMode: 'home',
  fixtureMatches: [],
  pointsPerWin: {},
  titles: [],
  isPlatformAdminPreview: false,
  setDemoPreviewRole: (role, platformAdminPreview = false) => set({ memberRole: role, isPlatformAdminPreview: platformAdminPreview }),
  setCurrentTeam: (slug, id, role, color, logoUrl = null, name = '', sponsorUrl = null) => {
    document.documentElement.style.setProperty('--team-color', color)
    document.documentElement.style.setProperty('--team-color-dim', color + '26')
    set({ currentTeamSlug: slug, currentTeamId: id, memberRole: role, teamColor: color, teamLogoUrl: logoUrl, teamName: name, teamSponsorUrl: sponsorUrl })
  },
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => {
    set(state => ({ categories: [...state.categories, category] }))
    if (isMockTeamId(get().currentTeamId)) useDemoStore.getState().addCategory(category)
  },
  setActiveCategory: (categoryId) => set({ activeCategoryId: categoryId, viewMode: 'category' }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTeamLogo: (url) => {
    set({ teamLogoUrl: url })
    if (isMockTeamId(get().currentTeamId)) useDemoStore.getState().setTeamLogo(url)
  },
  setTeamSponsor: (url) => {
    set({ teamSponsorUrl: url })
    if (isMockTeamId(get().currentTeamId)) useDemoStore.getState().setActiveSponsor(url)
  },
  renameCategory: (id, name) => {
    set(state => ({
      categories: state.categories.map(c => c.id === id ? { ...c, name } : c),
    }))
    if (isMockTeamId(get().currentTeamId)) useDemoStore.getState().renameCategory(id, name)
  },
  setMatchResult: (matchId, homeScore, awayScore) => {
    set(state => ({
      fixtureMatches: state.fixtureMatches.map(m =>
        m.id === matchId ? { ...m, home_score: homeScore, away_score: awayScore, played: true } : m
      ),
    }))
    if (isMockTeamId(get().currentTeamId)) {
      useDemoStore.getState().setMatchResult(matchId, homeScore, awayScore)
    } else {
      supabase.from('fixture_matches')
        .update({ home_score: homeScore, away_score: awayScore, played: true })
        .eq('id', matchId).then()
    }
  },
  setPointsPerWin: (categoryId, pts) => {
    set(state => ({
      pointsPerWin: { ...state.pointsPerWin, [categoryId]: pts },
    }))
    if (isMockTeamId(get().currentTeamId)) {
      useDemoStore.getState().setPointsPerWin(categoryId, pts)
    } else {
      supabase.from('categories').update({ points_per_win: pts }).eq('id', categoryId).then()
    }
  },
  addFixtureMatches: (matches) => {
    set(state => ({
      fixtureMatches: [...state.fixtureMatches, ...matches],
    }))
    const teamId = get().currentTeamId
    if (isMockTeamId(teamId)) {
      useDemoStore.getState().addFixtureMatches(matches)
    } else {
      supabase.from('fixture_matches').insert(matches.map(m => ({
        team_id: teamId,
        category_id: m.category_id,
        round: m.round,
        home_team: m.home_team,
        away_team: m.away_team,
        date: m.date,
        home_score: m.home_score,
        away_score: m.away_score,
        played: m.played,
      }))).then()
    }
  },
  updateFixtureMatch: (matchId, patch) => {
    set(state => ({
      fixtureMatches: state.fixtureMatches.map(m => m.id === matchId ? { ...m, ...patch } : m),
    }))
    if (isMockTeamId(get().currentTeamId)) {
      useDemoStore.setState(state => ({
        fixtureMatches: state.fixtureMatches.map(m => m.id === matchId ? { ...m, ...patch } : m),
      }))
    } else {
      supabase.from('fixture_matches').update(patch).eq('id', matchId).then()
    }
  },
  addTitle: async (categoryId, tournament, year) => {
    const teamId = get().currentTeamId
    if (isMockTeamId(teamId)) {
      const title = { id: `demo-title-${Date.now()}`, category_id: categoryId, tournament, year }
      useDemoStore.getState().addTitle(title)
      set(state => ({ titles: [...state.titles, { ...title, team_id: teamId ?? 'mock-team-1', created_at: new Date().toISOString() }] }))
    } else {
      const { data, error } = await supabase.from('titles')
        .insert({ team_id: teamId, category_id: categoryId, tournament, year })
        .select().single()
      if (!error && data) set(state => ({ titles: [...state.titles, data] }))
    }
  },
  removeTitle: async (id) => {
    if (isMockTeamId(get().currentTeamId)) {
      useDemoStore.getState().removeTitle(id)
    } else {
      await supabase.from('titles').delete().eq('id', id)
    }
    set(state => ({ titles: state.titles.filter(t => t.id !== id) }))
  },
  clearTeam: () => set({
    currentTeamSlug: null, currentTeamId: null, memberRole: null, categories: [],
    activeCategoryId: null, viewMode: 'home', fixtureMatches: [], pointsPerWin: {}, titles: [],
    teamLogoUrl: null, teamSponsorUrl: null, teamName: '',
  }),
}))
