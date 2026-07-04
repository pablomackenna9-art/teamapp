import { Outlet, useParams, useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { CategoryNav } from '@/components/CategoryNav'
import { TeamHeader } from '@/components/TeamHeader'
import { DemoRoleSwitcher } from '@/components/DemoRoleSwitcher'
import { useAuthStore, useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockTeam } from '@/lib/mock'

export function TeamLayout() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { user } = useAuthStore()
  const { setCurrentTeam, setCategories, clearTeam } = useTeamStore()
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)

  // Only show the header on the dashboard (root team path)
  const isDashboard = location.pathname === `/team/${slug}`

  useEffect(() => {
    async function loadTeam() {
      if (!slug) { setReady(true); return }

      // Reset state first so a new/different team never briefly shows the
      // previous team's (or the demo's) leftover fixture/category data.
      clearTeam()
      setReady(false)
      setDenied(false)

      if (!isSupabaseConfigured || slug === mockTeam.slug) {
        // Demo team — hydrate from the persisted demo store, not static mock constants,
        // so edits made during a previous session (logo, categories, fixture, etc.) survive reload.
        const demo = useDemoStore.getState()
        setCurrentTeam(mockTeam.slug, mockTeam.id, 'admin', mockTeam.primary_color, demo.teamLogoUrl, demo.teamName, demo.activeSponsor)
        setCategories(demo.categories)
        useTeamStore.setState({
          fixtureMatches: demo.fixtureMatches,
          pointsPerWin: demo.pointsPerWin,
          titles: demo.titles.map(t => ({ ...t, team_id: mockTeam.id, created_at: '' })),
        })
        setReady(true)
        return
      }

      const { data: team } = await supabase
        .from('teams').select('*').eq('slug', slug).single()

      if (!team) { setReady(true); return }

      const { data: member } = await supabase
        .from('team_members').select('role')
        .eq('team_id', team.id).eq('user_id', user?.id ?? '').maybeSingle()

      const { data: platformAdmin } = await supabase
        .from('platform_admins').select('user_id')
        .eq('user_id', user?.id ?? '').maybeSingle()

      if (!member && !platformAdmin) {
        // Not a member of this team and not a platform admin — no access
        setDenied(true)
        setReady(true)
        return
      }

      const [{ data: cats }, { data: matches }, { data: titles }] = await Promise.all([
        supabase.from('categories').select('*').eq('team_id', team.id),
        supabase.from('fixture_matches').select('*').eq('team_id', team.id),
        supabase.from('titles').select('*').eq('team_id', team.id),
      ])

      const pointsPerWin: Record<string, 2 | 3> = {}
      for (const c of cats ?? []) pointsPerWin[c.id] = c.points_per_win ?? 3

      setCurrentTeam(team.slug, team.id, member?.role ?? 'admin', team.primary_color, team.logo_url, team.name, team.sponsor_url)
      setCategories(cats ?? [])
      useTeamStore.setState({ fixtureMatches: matches ?? [], pointsPerWin, titles: titles ?? [] })
      setReady(true)
    }

    loadTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-800 rounded-full animate-spin"
          style={{ borderTopColor: 'var(--team-color)' }} />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-3">
        <ShieldAlert size={40} className="text-red-500" />
        <p className="text-white font-bold text-lg">No tenés acceso a este equipo</p>
        <p className="text-gray-500 text-sm max-w-xs">
          Solo los miembros de este club pueden ver su información.
        </p>
        <Link to="/teams" className="mt-3 text-sm font-semibold" style={{ color: 'var(--team-color)' }}>
          Volver a mis equipos
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ paddingBottom: '72px' }}>
      {isDashboard && <TeamHeader />}
      <main className="flex-1">
        <Outlet />
      </main>
      <DemoRoleSwitcher />
      <CategoryNav />
    </div>
  )
}
