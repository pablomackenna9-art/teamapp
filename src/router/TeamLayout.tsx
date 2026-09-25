import { Outlet, useParams, useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShieldAlert, UserCheck, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { CategoryNav } from '@/components/CategoryNav'
import { BottomSectionNav } from '@/components/BottomSectionNav'
import { TeamHeader } from '@/components/TeamHeader'
import { DemoRoleSwitcher } from '@/components/DemoRoleSwitcher'
import { Button } from '@/components/Button'
import { useAuthStore, useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mockTeam } from '@/lib/mock'

interface PublicPlayer { id: string; name: string; number: number | null; category_name: string | null; already_linked: boolean }

// Shown to a logged-in user who opened a club's public link but isn't a
// member and has no invite — lets them say "soy jugador de este equipo" by
// picking themselves from the roster; a coordinador approves it before the
// account is actually linked to that ficha.
function SoyJugadorPanel({ teamId }: { teamId: string }) {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<PublicPlayer[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function loadPlayers() {
    setOpen(true)
    if (players) return
    const { data, error } = await supabase.rpc('list_team_players_public', { p_team_id: teamId })
    if (error) { toast.error(error.message); return }
    setPlayers(data ?? [])
  }

  async function handleSend() {
    if (!selected) return
    setSending(true)
    const { error } = await supabase.rpc('request_player_link', { p_player_id: selected })
    setSending(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  if (!user) return null

  if (sent) {
    return (
      <p className="text-green-400 text-sm mt-4 flex items-center gap-2">
        <Check size={16} /> Solicitud enviada — el coordinador la va a revisar.
      </p>
    )
  }

  if (!open) {
    return (
      <button onClick={loadPlayers} className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--team-color)' }}>
        <UserCheck size={16} /> Soy jugador de este equipo
      </button>
    )
  }

  return (
    <div className="w-full max-w-xs text-left">
      <p className="text-gray-400 text-xs mb-2">Elegí tu ficha en el plantel:</p>
      {!players ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-gray-700 rounded-full animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mb-3">
          {players.filter(p => !p.already_linked).map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="flex items-center gap-2 p-2.5 rounded-xl border text-left"
              style={selected === p.id ? { borderColor: 'var(--team-color)', background: 'var(--team-color-dim)' } : { borderColor: '#1f2937' }}
            >
              <span className="text-sm text-white flex-1">{p.name}{p.number != null && ` #${p.number}`}</span>
              {p.category_name && <span className="text-xs text-gray-500">{p.category_name}</span>}
            </button>
          ))}
          {players.filter(p => !p.already_linked).length === 0 && (
            <p className="text-gray-600 text-xs text-center py-2">No hay fichas sin vincular en este club.</p>
          )}
        </div>
      )}
      <Button fullWidth size="sm" disabled={!selected} loading={sending} onClick={handleSend}>Enviar solicitud</Button>
    </div>
  )
}

export function TeamLayout() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { user } = useAuthStore()
  const { setCurrentTeam, setCategories, clearTeam, teamColor } = useTeamStore()
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)
  const [deniedTeamId, setDeniedTeamId] = useState<string | null>(null)

  // Same hero on Inicio and Tabla — the two "landing" screens for a club —
  // so the escudo/nombre/colores stay consistent instead of only on Inicio.
  const isDashboard = location.pathname === `/team/${slug}` || location.pathname === `/team/${slug}/standings`

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
        setDeniedTeamId(team.id)
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
        {deniedTeamId && <SoyJugadorPanel teamId={deniedTeamId} />}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-dvh"
      style={{
        paddingBottom: '72px',
        // A vivid, full-page backdrop in the club's own color on the two
        // "landing" screens (Inicio/Tabla) — a flat dark background reads as
        // plain black for pale team colors, so this blends a strong wash of
        // the color into a dark navy base instead of relying on low opacity
        // over near-black.
        background: isDashboard
          ? `linear-gradient(180deg, ${teamColor}55 0%, #0a1020 340px, #05070d 100%)`
          : undefined,
      }}
    >
      {isDashboard && <TeamHeader />}
      <CategoryNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <DemoRoleSwitcher />
      <BottomSectionNav />
    </div>
  )
}
