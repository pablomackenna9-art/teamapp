import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shield, Crown, Trash2, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore, useTeamStore } from '@/store/authStore'
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
  const demoPlatformAdminPreview = useTeamStore(s => s.isPlatformAdminPreview)
  const demoLogoUrl = useDemoStore(s => s.teamLogoUrl)
  const demoTeamName = useDemoStore(s => s.teamName)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user || !isSupabaseConfigured) {
        setTeams([])
        setLoading(false)
        return
      }

      const { data: adminRow } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const platformAdmin = !!adminRow
      setIsPlatformAdmin(platformAdmin)

      if (platformAdmin) {
        // Platform admin sees every team on the platform
        const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
        setTeams(data ?? [])
      } else {
        const { data } = await supabase
          .from('team_members')
          .select('team:teams(*)')
          .eq('user_id', user.id)
        setTeams((data?.map((d: any) => d.team).filter(Boolean) ?? []))
      }

      setLoading(false)
    }
    load()
  }, [user])

  const showDemoCard = !teams.find(t => t.slug === 'maestros-fc')
  const showPlatformAdminUI = isPlatformAdmin || demoPlatformAdminPreview

  async function confirmDeleteTeam() {
    if (!teamToDelete) return
    setDeleting(true)
    const { error } = await supabase.from('teams').delete().eq('id', teamToDelete.id)
    setDeleting(false)
    if (error) {
      toast.error('No se pudo eliminar el equipo: ' + error.message)
      return
    }
    setTeams(prev => prev.filter(t => t.id !== teamToDelete.id))
    toast.success(`"${teamToDelete.name}" fue eliminado`)
    setTeamToDelete(null)
  }

  return (
    <div className="min-h-dvh px-4 pt-12 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {showPlatformAdminUI ? 'Todos los equipos' : 'Mis equipos'}
            {showPlatformAdminUI && <Crown size={18} className="text-amber-400" />}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {showPlatformAdminUI ? 'Panel de administrador de TeamApp' : 'Seleccioná un equipo para continuar'}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/teams/new')}>
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      {showPlatformAdminUI && (
        <div className="mb-6 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-amber-400 text-xs font-semibold">
            👑 Sos administrador de la plataforma — ves y podés gestionar todos los clubes
          </p>
        </div>
      )}

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
              {showPlatformAdminUI && (
                <button
                  onClick={e => { e.stopPropagation(); setTeamToDelete(team) }}
                  className="ml-auto p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  aria-label="Eliminar equipo"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {!showPlatformAdminUI && <div className="ml-auto text-gray-600">›</div>}
            </Card>
          ))}

          {/* Demo team shortcut — always visible if not already a real team */}
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

      {teamToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setTeamToDelete(null)}
        >
          <div className="w-full max-w-sm bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-10 sm:pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={18} />
                <h3 className="font-bold">Eliminar equipo</h3>
              </div>
              <button onClick={() => setTeamToDelete(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-gray-300 text-sm mb-1">
              Vas a eliminar <span className="font-semibold text-white">{teamToDelete.name}</span> permanentemente.
            </p>
            <p className="text-gray-500 text-xs mb-6">
              Se borran también su plantel, fixture, categorías, avisos y fotos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setTeamToDelete(null)}>Cancelar</Button>
              <Button variant="danger" fullWidth loading={deleting} onClick={confirmDeleteTeam}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
