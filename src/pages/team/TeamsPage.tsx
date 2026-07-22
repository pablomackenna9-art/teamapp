import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shield } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import type { Team } from '@/types'
import { mockTeam } from '@/lib/mock'
import { initials } from '@/lib/utils'

export function TeamsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const demoLogoUrl = useDemoStore(s => s.teamLogoUrl)
  const demoTeamName = useDemoStore(s => s.teamName)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user || !isSupabaseConfigured) {
        setTeams([])
        setLoading(false)
        return
      }

      // Turn any pending coordinador/player invite for this email into real
      // membership before checking what teams this user belongs to — this
      // must be awaited here too (not just fire-and-forget in RootLayout),
      // otherwise a just-invited user can land here before the invite has
      // actually been claimed and see an empty "Mis equipos".
      await supabase.rpc('claim_invites')

      const { data: adminRow } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminRow) {
        navigate('/admin', { replace: true })
        return
      }

      const { data } = await supabase
        .from('team_members')
        .select('team:teams(*)')
        .eq('user_id', user.id)
      const myTeams: Team[] = data?.map((d: any) => d.team).filter(Boolean) ?? []

      // A single-team member (the common case for a coordinador/player just
      // invited) should land straight on their team, not on a picker.
      if (myTeams.length === 1) {
        navigate(`/team/${myTeams[0].slug}`, { replace: true })
        return
      }

      setTeams(myTeams)
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const showDemoCard = !teams.find(t => t.slug === 'maestros-fc')

  return (
    <div className="min-h-dvh px-4 pt-12 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis equipos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Seleccioná un equipo para continuar</p>
        </div>
        <Button size="sm" onClick={() => navigate('/teams/new')}>
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: 'var(--team-color)' }} />
        </div>
      ) : teams.length === 0 && !showDemoCard ? (
        <EmptyState
          icon={<Shield size={48} />}
          title="No tenés equipos aún"
          description="Creá tu primer equipo para empezar"
          action={<Button onClick={() => navigate('/teams/new')}>Crear equipo</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {teams.length === 0 && (
            <div className="text-center py-6">
              <Shield size={40} className="mx-auto text-gray-700 mb-3" />
              <p className="text-white font-semibold">No tenés equipos aún</p>
              <p className="text-gray-500 text-sm mt-1">Creá tu primer equipo o mirá la demo abajo</p>
            </div>
          )}

          {teams.map(team => (
            <Card
              key={team.id}
              onClick={() => navigate(`/team/${team.slug}`)}
              className="flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
                style={{ background: team.primary_color + '26', color: team.primary_color }}
              >
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  team.name[0]
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{team.name}</p>
                <p className="text-gray-500 text-sm truncate">/{team.slug}</p>
              </div>
              <div className="ml-auto text-gray-600">›</div>
            </Card>
          ))}

          {showDemoCard && (
            <Card
              onClick={() => navigate('/team/maestros-fc')}
              className="flex items-center gap-4 border-dashed opacity-60"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden shrink-0"
                style={{ background: '#22c55e26', color: '#22c55e' }}
              >
                {demoLogoUrl ? (
                  <img src={demoLogoUrl} alt={demoTeamName || mockTeam.name} className="w-full h-full object-cover" />
                ) : (
                  initials(demoTeamName || mockTeam.name)
                )}
              </div>
              <div>
                <p className="font-semibold text-white">{demoTeamName || mockTeam.name}</p>
                <p className="text-gray-500 text-xs">Demo — datos de ejemplo</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
