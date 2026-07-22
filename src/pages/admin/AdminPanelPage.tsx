import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shield, Trash2, X, AlertTriangle, Megaphone, ImagePlus, Check, Trophy, Users2, BarChart3, LayoutDashboard, UserCog, ShieldCheck, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { uploadTeamPhoto } from '@/lib/storage'
import { RankingsPage } from '@/pages/rankings/RankingsPage'
import type { Team, Category, League } from '@/types'

type Tab = 'dashboard' | 'equipos' | 'ligas' | 'auspiciadores' | 'rankings' | 'usuarios'

interface UserRow {
  user_id: string
  email: string
  full_name: string
  team_id: string
  team_name: string
  league_name: string | null
  category_name: string | null
  player_position: string | null
  role: string
  is_platform_admin: boolean
}

const ROLE_LABEL: Record<string, string> = {
  player: 'Jugador',
  dt: 'DT',
  coordinador: 'Coordinador',
  admin: 'Admin de club',
  captain: 'Capitán',
}
const ROLE_OPTIONS = ['player', 'dt', 'coordinador', 'admin', 'captain']

// ── Manage a specific club's per-category sponsors without entering it ────────
function TeamSponsorSheet({ team, onClose }: { team: Team; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    supabase.from('categories').select('*').eq('team_id', team.id).order('name')
      .then(({ data }) => { setCategories(data ?? []); setLoading(false) })
  }, [team.id])

  async function handleUpload(cat: Category, file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    setUploadingId(cat.id)
    try {
      const url = await uploadTeamPhoto(file, `${team.id}/sponsor-${cat.id}`)
      const { error } = await supabase.from('categories').update({ sponsor_url: url }).eq('id', cat.id)
      if (error) throw error
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, sponsor_url: url } : c))
      toast.success(`Auspiciador de ${cat.name} actualizado`)
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir el auspiciador')
    }
    setUploadingId(null)
  }

  async function handleRemove(cat: Category) {
    const { error } = await supabase.from('categories').update({ sponsor_url: null }).eq('id', cat.id)
    if (error) { toast.error(error.message); return }
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, sponsor_url: null } : c))
    toast.success('Auspiciador quitado')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-10 sm:pb-6 max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h2 className="text-white font-bold text-lg">Auspiciadores de {team.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-gray-500 text-sm mb-1 shrink-0">Cada categoría puede tener su propio auspiciador.</p>
        <p className="text-gray-600 text-xs mb-4 shrink-0">Medida recomendada: 1200×275px, banner ancho ya recortado.</p>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
          ) : categories.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Este club todavía no tiene categorías.</p>
          ) : categories.map(cat => (
            <div key={cat.id} className="py-3 border-b border-gray-800 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{cat.name}</span>
                {cat.sponsor_url && (
                  <button onClick={() => handleRemove(cat)} className="text-gray-600 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
              {cat.sponsor_url && (
                <div className="rounded-xl overflow-hidden border border-gray-700 bg-black mb-2" style={{ height: 80 }}>
                  <img src={cat.sponsor_url} alt={`Auspiciador ${cat.name}`} className="w-full h-full object-cover" />
                </div>
              )}
              <button
                onClick={() => fileRefs.current[cat.id]?.click()}
                disabled={uploadingId === cat.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: '#22c55e20', color: '#22c55e' }}
              >
                {uploadingId === cat.id ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ImagePlus size={14} />}
                {uploadingId === cat.id ? 'Subiendo...' : (cat.sponsor_url ? 'Cambiar imagen' : 'Subir imagen')}
              </button>
              <input ref={el => { fileRefs.current[cat.id] = el }} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(cat, f) }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Assign/change which league an existing club belongs to ────────────────────
function AssignLeagueSheet({ team, leagues, onClose, onAssigned }: {
  team: Team; leagues: League[]; onClose: () => void; onAssigned: (leagueId: string | null) => void
}) {
  const [saving, setSaving] = useState(false)

  async function assign(leagueId: string | null) {
    setSaving(true)
    const { error } = await supabase.from('teams').update({ league_id: leagueId }).eq('id', team.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    onAssigned(leagueId)
    toast.success(leagueId ? 'Liga asignada' : 'Liga quitada')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-lg">Liga de {team.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-gray-500 text-sm mb-5">Elegí a qué liga pertenece este club.</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => assign(null)} disabled={saving}
            className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
            style={!team.league_id ? { background: '#37415140', borderColor: '#6b7280' } : { background: '#111827', borderColor: '#1f2937' }}>
            <span className="text-sm font-semibold text-white flex-1">Sin liga</span>
            {!team.league_id && <Check size={16} className="text-gray-400" />}
          </button>
          {leagues.map(l => {
            const isCurrent = team.league_id === l.id
            return (
              <button key={l.id} onClick={() => assign(l.id)} disabled={saving}
                className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
                style={isCurrent ? { background: '#3b82f620', borderColor: '#3b82f6' } : { background: '#111827', borderColor: '#1f2937' }}>
                <Trophy size={15} className="text-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-white flex-1">{l.name}</span>
                {isCurrent && <Check size={16} className="text-blue-400" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Add/remove one or more coordinadores for a club ────────────────────────
function CoordinadorSheet({ team, userRows, onClose, onChanged }: {
  team: Team; userRows: UserRow[]; onClose: () => void; onChanged: () => void
}) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const coordinadores = userRows.filter(r => r.team_id === team.id && r.role === 'coordinador')

  async function handleAdd() {
    const trimmed = email.trim()
    if (!trimmed) { toast.error('Ingresá el email'); return }
    setSaving(true)
    const { error } = await supabase.rpc('admin_set_team_coordinador', { p_team_id: team.id, p_email: trimmed })
    if (error) {
      if (error.message.includes('No existe un usuario registrado')) {
        // Not signed up yet — queue an invite; claim_invites() applies it on their first login.
        const { error: inviteError } = await supabase.from('team_invites').insert({ team_id: team.id, email: trimmed, role: 'coordinador' })
        setSaving(false)
        if (inviteError) { toast.error(inviteError.message); return }
        toast.success(`Invitación enviada — ${trimmed} será coordinador cuando entre por primera vez`)
        setEmail('')
        onChanged()
        return
      }
      setSaving(false)
      toast.error(error.message)
      return
    }
    setSaving(false)
    toast.success(`${trimmed} ahora es coordinador de ${team.name}`)
    setEmail('')
    onChanged()
  }

  async function handleRemove(userId: string) {
    setRemovingUserId(userId)
    const { error } = await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId)
    setRemovingUserId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Coordinador quitado')
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-lg">Coordinadores de {team.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-gray-500 text-sm mb-4">Podés asignar más de un coordinador al mismo club.</p>

        <div className="flex flex-col gap-1.5 mb-4">
          {coordinadores.length === 0 && <p className="text-gray-600 text-sm text-center py-4">Sin coordinador asignado todavía.</p>}
          {coordinadores.map(c => (
            <div key={c.user_id} className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{ background: '#111827' }}>
              <span className="text-sm text-white flex-1 truncate">{c.full_name || c.email}</span>
              <button onClick={() => handleRemove(c.user_id)} disabled={removingUserId === c.user_id} className="text-gray-600 hover:text-red-400 shrink-0" aria-label="Quitar coordinador">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="coordinador@email.com"
            type="email"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
          />
          <Button loading={saving} onClick={handleAdd}><Plus size={15} /> Agregar</Button>
        </div>
        <p className="text-gray-600 text-xs mt-2">Si la persona todavía no se registró, va a tener acceso de coordinador apenas entre por primera vez con ese mail.</p>
      </div>
    </div>
  )
}

// ── EQUIPOS TAB ─────────────────────────────────────────────────────────────
function EquiposTab({ teams, leagues, userRows, loading, onTeamsChange, onRefreshUsers }: {
  teams: Team[]; leagues: League[]; userRows: UserRow[]; loading: boolean; onTeamsChange: (teams: Team[]) => void; onRefreshUsers: () => void
}) {
  const navigate = useNavigate()
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sponsorTeam, setSponsorTeam] = useState<Team | null>(null)
  const [leagueTeam, setLeagueTeam] = useState<Team | null>(null)
  const [coordinadorTeam, setCoordinadorTeam] = useState<Team | null>(null)

  async function confirmDeleteTeam() {
    if (!teamToDelete) return
    setDeleting(true)
    const { error } = await supabase.from('teams').delete().eq('id', teamToDelete.id)
    setDeleting(false)
    if (error) { toast.error('No se pudo eliminar el equipo: ' + error.message); return }
    onTeamsChange(teams.filter(t => t.id !== teamToDelete.id))
    toast.success(`"${teamToDelete.name}" fue eliminado`)
    setTeamToDelete(null)
  }

  function renderTeamCard(team: Team) {
    const coordinadores = userRows.filter(r => r.team_id === team.id && r.role === 'coordinador')
    return (
      <Card key={team.id} onClick={() => navigate(`/team/${team.slug}`)} className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: team.primary_color + '26', color: team.primary_color }}>
          {team.logo_url ? <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover" /> : team.name[0]}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">{team.name}</p>
          <p className="text-gray-500 text-sm truncate">/{team.slug}</p>
          <p className="text-gray-600 text-xs truncate">
            {coordinadores.length > 0
              ? `Coordinador: ${coordinadores.map(c => c.full_name || c.email).join(', ')}`
              : 'Sin coordinador asignado'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); setCoordinadorTeam(team) }} className="p-2 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10" aria-label="Coordinador">
            <UserCog size={16} />
          </button>
          <button onClick={e => { e.stopPropagation(); setLeagueTeam(team) }} className="p-2 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10" aria-label="Liga">
            <Trophy size={16} />
          </button>
          <button onClick={e => { e.stopPropagation(); setSponsorTeam(team) }} className="p-2 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-500/10" aria-label="Auspiciador">
            <Megaphone size={16} />
          </button>
          <button onClick={e => { e.stopPropagation(); setTeamToDelete(team) }} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10" aria-label="Eliminar equipo">
            <Trash2 size={16} />
          </button>
        </div>
      </Card>
    )
  }

  const unassigned = teams.filter(t => !t.league_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">{teams.length} club{teams.length !== 1 ? 'es' : ''} en la plataforma</p>
        <Button size="sm" onClick={() => navigate('/teams/new')}>
          <Plus size={16} /> Nuevo equipo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
      ) : teams.length === 0 ? (
        <EmptyState icon={<Shield size={48} />} title="No hay equipos aún" description="Creá el primero para empezar" action={<Button onClick={() => navigate('/teams/new')}>Crear equipo</Button>} />
      ) : (
        <div className="flex flex-col gap-5">
          {leagues.map(league => {
            const leagueTeams = teams.filter(t => t.league_id === league.id)
            if (leagueTeams.length === 0) return null
            return (
              <div key={league.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={13} className="text-blue-400" />
                  <span className="text-xs font-black tracking-wider text-gray-400 uppercase">{league.name}</span>
                </div>
                <div className="flex flex-col gap-3">{leagueTeams.map(renderTeamCard)}</div>
              </div>
            )
          })}
          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black tracking-wider text-gray-500 uppercase">Sin liga asignada</span>
              </div>
              <div className="flex flex-col gap-3">{unassigned.map(renderTeamCard)}</div>
            </div>
          )}
        </div>
      )}

      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && setTeamToDelete(null)}>
          <div className="w-full max-w-sm bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-10 sm:pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-400"><AlertTriangle size={18} /><h3 className="font-bold">Eliminar equipo</h3></div>
              <button onClick={() => setTeamToDelete(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-gray-300 text-sm mb-1">Vas a eliminar <span className="font-semibold text-white">{teamToDelete.name}</span> permanentemente.</p>
            <p className="text-gray-500 text-xs mb-6">Se borran también su plantel, fixture, categorías, avisos y fotos. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setTeamToDelete(null)}>Cancelar</Button>
              <Button variant="danger" fullWidth loading={deleting} onClick={confirmDeleteTeam}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      {sponsorTeam && <TeamSponsorSheet team={sponsorTeam} onClose={() => setSponsorTeam(null)} />}
      {leagueTeam && (
        <AssignLeagueSheet
          team={leagueTeam}
          leagues={leagues}
          onClose={() => setLeagueTeam(null)}
          onAssigned={leagueId => onTeamsChange(teams.map(t => t.id === leagueTeam.id ? { ...t, league_id: leagueId } : t))}
        />
      )}
      {coordinadorTeam && (
        <CoordinadorSheet
          team={coordinadorTeam}
          userRows={userRows}
          onClose={() => setCoordinadorTeam(null)}
          onChanged={onRefreshUsers}
        />
      )}
    </div>
  )
}

// ── LIGAS TAB ───────────────────────────────────────────────────────────────
function LigasTab({ leagues, onLeaguesChange }: { leagues: League[]; onLeaguesChange: (leagues: League[]) => void }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Ingresá el nombre de la liga'); return }
    setSaving(true)
    const { data, error } = await supabase.from('leagues').insert({ name: trimmed }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    onLeaguesChange([...leagues, data].sort((a, b) => a.name.localeCompare(b.name)))
    setName('')
    toast.success('Liga creada')
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Agrupá los clubes por liga para verlos separados y armar rankings entre ellos.</p>
      <Card padding={false} className="px-4 mb-4">
        {leagues.map(l => (
          <div key={l.id} className="flex items-center gap-2 py-3 border-b border-gray-800 last:border-0">
            <Trophy size={14} className="text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-white">{l.name}</span>
          </div>
        ))}
        {leagues.length === 0 && <p className="text-gray-600 text-sm text-center py-6">Todavía no creaste ninguna liga.</p>}
      </Card>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="Nombre de la nueva liga"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
        />
        <Button loading={saving} onClick={handleCreate}><Plus size={15} /> Agregar</Button>
      </div>
    </div>
  )
}

// ── AUSPICIADORES TAB — navegar Liga → Categoría → Equipo ──────────────────
const NO_LEAGUE = '__none__'
const ALL_LEAGUES = '__all__'

function CategorySponsorInlineRow({ team, category, onChanged }: {
  team: Team; category: Category; onChanged: (updated: Category) => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    setUploading(true)
    try {
      const url = await uploadTeamPhoto(file, `${team.id}/sponsor-${category.id}`)
      const { error } = await supabase.from('categories').update({ sponsor_url: url }).eq('id', category.id)
      if (error) throw error
      onChanged({ ...category, sponsor_url: url })
      toast.success(`Auspiciador de ${team.name} · ${category.name} actualizado`)
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir el auspiciador')
    }
    setUploading(false)
  }

  async function handleRemove() {
    const { error } = await supabase.from('categories').update({ sponsor_url: null }).eq('id', category.id)
    if (error) { toast.error(error.message); return }
    onChanged({ ...category, sponsor_url: null })
    toast.success('Auspiciador quitado')
  }

  return (
    <Card className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden" style={{ background: team.primary_color + '26', color: team.primary_color }}>
        {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-cover" /> : team.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{team.name}</p>
        <p className="text-gray-500 text-xs truncate">{category.name}</p>
      </div>
      {category.sponsor_url && (
        <div className="rounded-lg overflow-hidden border border-gray-700 bg-black shrink-0" style={{ width: 72, height: 30 }}>
          <img src={category.sponsor_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
        aria-label="Subir auspiciador"
      >
        {uploading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" /> : <ImagePlus size={16} />}
      </button>
      {category.sponsor_url && (
        <button onClick={handleRemove} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 shrink-0" aria-label="Quitar auspiciador">
          <Trash2 size={16} />
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
    </Card>
  )
}

function AuspiciadoresTab({ teams, leagues, categories, onCategoriesChange }: {
  teams: Team[]; leagues: League[]; categories: Category[]; onCategoriesChange: (categories: Category[]) => void
}) {
  const [selectedLeague, setSelectedLeague] = useState<string>(ALL_LEAGUES)
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Set<string>>(new Set())
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkPreview, setBulkPreview] = useState<string | null>(null)
  const [applyingBulk, setApplyingBulk] = useState(false)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const teamById = new Map(teams.map(t => [t.id, t]))

  const teamsInLeague = teams.filter(t => {
    if (selectedLeague === ALL_LEAGUES) return true
    if (selectedLeague === NO_LEAGUE) return !t.league_id
    return t.league_id === selectedLeague
  })
  const teamIdsInLeague = new Set(teamsInLeague.map(t => t.id))

  const categoryNamesInLeague = Array.from(
    new Set(categories.filter(c => teamIdsInLeague.has(c.team_id)).map(c => c.name))
  ).sort((a, b) => a.localeCompare(b))

  const matchingCategories = categories.filter(c => teamIdsInLeague.has(c.team_id) && selectedCategoryNames.has(c.name))

  function toggleCategoryName(name: string) {
    setSelectedCategoryNames(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleRow(id: string) {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllRows() {
    setSelectedCategoryIds(prev =>
      prev.size === matchingCategories.length ? new Set() : new Set(matchingCategories.map(c => c.id))
    )
  }

  function updateCategory(updated: Category) {
    onCategoriesChange(categories.map(c => c.id === updated.id ? updated : c))
  }

  async function handleBulkApply() {
    if (!bulkFile) { toast.error('Elegí una imagen'); return }
    if (selectedCategoryIds.size === 0) { toast.error('Marcá al menos un club/categoría de la lista'); return }
    setApplyingBulk(true)
    try {
      // Storage RLS reads the first path segment as a team_id uuid, so this
      // must live under some real team's folder — any team works since a
      // platform admin passes is_team_admin() for every team.
      const anyTeamId = matchingCategories.find(c => selectedCategoryIds.has(c.id))?.team_id ?? teams[0]?.id
      const url = await uploadTeamPhoto(bulkFile, `${anyTeamId}/bulk-sponsor-${Date.now()}`)
      const ids = Array.from(selectedCategoryIds)
      const { error } = await supabase.from('categories').update({ sponsor_url: url }).in('id', ids)
      if (error) throw error
      onCategoriesChange(categories.map(c => ids.includes(c.id) ? { ...c, sponsor_url: url } : c))
      toast.success(`Auspiciador aplicado a ${ids.length} categoría${ids.length !== 1 ? 's' : ''}`)
      setBulkFile(null); setBulkPreview(null); setSelectedCategoryIds(new Set())
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo aplicar el auspiciador')
    }
    setApplyingBulk(false)
  }

  const leagueOptions = [
    { key: ALL_LEAGUES, label: 'Todas las ligas' },
    ...leagues.map(l => ({ key: l.id, label: l.name })),
    { key: NO_LEAGUE, label: 'Sin liga' },
  ]

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        Elegí una liga y una o más categorías para ver y editar el auspiciador de cada club — si un club tiene varias categorías (ej. Boedo con Senior, Reserva, Femenino), cada una aparece por separado y podés marcar sólo las que querés actualizar.
      </p>

      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {leagueOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => { setSelectedLeague(opt.key); setSelectedCategoryNames(new Set()); setSelectedCategoryIds(new Set()) }}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
            style={selectedLeague === opt.key ? { background: '#3b82f6', color: '#030712' } : { background: '#1f2937', color: '#9ca3af' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {categoryNamesInLeague.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">No hay categorías cargadas para esta liga todavía.</p>
      ) : (
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {categoryNamesInLeague.map(name => (
            <button
              key={name}
              onClick={() => toggleCategoryName(name)}
              className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
              style={selectedCategoryNames.has(name) ? { background: '#22c55e', color: '#030712' } : { background: '#1f2937', color: '#9ca3af' }}
            >
              {selectedCategoryNames.has(name) && <Check size={12} />} {name}
            </button>
          ))}
        </div>
      )}

      {matchingCategories.length > 0 && (
        <>
          <div className="rounded-2xl border border-dashed border-gray-700 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Aplicar la misma imagen a los marcados abajo ({selectedCategoryIds.size})
              </p>
              <button onClick={toggleAllRows} className="text-xs font-semibold shrink-0" style={{ color: '#22c55e' }}>
                {selectedCategoryIds.size === matchingCategories.length ? 'Ninguno' : 'Todos'}
              </button>
            </div>
            {bulkPreview ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-gray-700 bg-black mb-3" style={{ height: 80 }}>
                <img src={bulkPreview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setBulkFile(null); setBulkPreview(null) }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => bulkFileRef.current?.click()} className="flex items-center justify-center gap-2 py-3 w-full rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 mb-3">
                <ImagePlus size={16} /><span className="text-xs font-semibold">Elegí una imagen</span>
              </button>
            )}
            <input ref={bulkFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (!f) return; setBulkFile(f); setBulkPreview(URL.createObjectURL(f)) }} />
            <Button fullWidth size="sm" loading={applyingBulk} onClick={handleBulkApply}>
              Aplicar a {selectedCategoryIds.size} marcado{selectedCategoryIds.size !== 1 ? 's' : ''}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {matchingCategories.map(cat => {
              const team = teamById.get(cat.team_id)
              if (!team) return null
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRow(cat.id)}
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2"
                    style={selectedCategoryIds.has(cat.id) ? { background: '#22c55e', borderColor: '#22c55e' } : { borderColor: '#374151' }}
                    aria-label="Marcar"
                  >
                    {selectedCategoryIds.has(cat.id) && <Check size={13} color="#030712" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <CategorySponsorInlineRow team={team} category={cat} onChanged={updateCategory} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {selectedCategoryNames.size === 0 && categoryNamesInLeague.length > 0 && (
        <p className="text-gray-600 text-sm text-center py-6">Elegí una o más categorías arriba para ver los clubes.</p>
      )}
    </div>
  )
}

// ── DASHBOARD TAB ───────────────────────────────────────────────────────────
function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-gray-500 text-sm mt-0.5">{label}</p>
    </Card>
  )
}

function DashboardTab({ teams, leagues, categories, onGoTo }: {
  teams: Team[]; leagues: League[]; categories: Category[]; onGoTo: (tab: Tab) => void
}) {
  const withSponsor = categories.filter(c => c.sponsor_url).length
  const unassigned = teams.filter(t => !t.league_id)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard value={teams.length} label="Equipos" accent="#22c55e" />
        <StatCard value={leagues.length} label="Ligas" accent="#3b82f6" />
        <StatCard value={categories.length} label="Categorías" accent="#a855f7" />
        <StatCard value={withSponsor} label="Con auspiciador" accent="#f59e0b" />
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gray-700 p-4 mb-4">
          <p className="text-sm font-semibold text-white mb-1">
            {unassigned.length} equipo{unassigned.length !== 1 ? 's' : ''} sin liga asignada
          </p>
          <p className="text-gray-500 text-xs mb-3">Asignalos desde la sección Equipos para que aparezcan en los rankings.</p>
          <Button size="sm" onClick={() => onGoTo('equipos')}>Ir a Equipos</Button>
        </div>
      )}

      <Card padding={false} className="px-4 mb-4">
        <div className="flex items-center gap-2 py-3 border-b border-gray-800">
          <Users2 size={14} className="text-green-400" />
          <span className="text-xs font-black tracking-wider text-gray-400 uppercase">Equipos recientes</span>
        </div>
        {teams.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Todavía no se creó ningún equipo.</p>
        ) : teams.slice(0, 6).map(t => (
          <button
            key={t.id}
            onClick={() => onGoTo('equipos')}
            className="w-full flex items-center gap-3 py-3 border-b border-gray-800/50 last:border-0 text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden" style={{ background: t.primary_color + '26', color: t.primary_color }}>
              {t.logo_url ? <img src={t.logo_url} alt="" className="w-full h-full object-cover" /> : t.name[0]}
            </div>
            <span className="text-sm font-semibold text-white flex-1 truncate">{t.name}</span>
            <span className="text-gray-600 text-xs shrink-0">{new Date(t.created_at).toLocaleDateString('es-CL')}</span>
          </button>
        ))}
      </Card>

      <Card padding={false} className="px-4">
        <div className="flex items-center gap-2 py-3 border-b border-gray-800">
          <Trophy size={14} className="text-blue-400" />
          <span className="text-xs font-black tracking-wider text-gray-400 uppercase">Ligas</span>
        </div>
        {leagues.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Todavía no creaste ninguna liga.</p>
        ) : leagues.map(l => {
          const count = teams.filter(t => t.league_id === l.id).length
          return (
            <div key={l.id} className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
              <span className="text-sm font-semibold text-white">{l.name}</span>
              <span className="text-gray-500 text-xs">{count} club{count !== 1 ? 'es' : ''}</span>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── USUARIOS TAB — usuarios de la app (excluye administradores) + acceso admin
interface PlatformAdminRow { user_id: string; email: string; created_at: string }

function UsuariosTab({ rows, loading, currentUserId, onRowsChange }: {
  rows: UserRow[]; loading: boolean; currentUserId: string | undefined; onRowsChange: (rows: UserRow[]) => void
}) {
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [email, setEmail] = useState('')
  const [granting, setGranting] = useState(false)

  async function loadAdmins() {
    setLoadingAdmins(true)
    const { data, error } = await supabase.rpc('admin_list_platform_admins')
    if (error) { toast.error(error.message); setLoadingAdmins(false); return }
    setAdmins(data ?? [])
    setLoadingAdmins(false)
  }

  useEffect(() => { loadAdmins() }, [])

  async function handleGrantAdmin() {
    const trimmed = email.trim()
    if (!trimmed) { toast.error('Ingresá el email del usuario'); return }
    setGranting(true)
    const { error } = await supabase.rpc('admin_grant_platform_admin', { p_email: trimmed })
    setGranting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`${trimmed} ahora es administrador de la plataforma`)
    setEmail('')
    loadAdmins()
    onRowsChange(rows.map(r => r.email.toLowerCase() === trimmed.toLowerCase() ? { ...r, is_platform_admin: true } : r))
  }

  async function handleRevokeAdmin(row: PlatformAdminRow) {
    if (row.user_id === currentUserId) { toast.error('No podés quitarte tu propio acceso'); return }
    if (!window.confirm(`¿Quitar acceso de administrador de plataforma a ${row.email}?`)) return
    const { error } = await supabase.rpc('admin_revoke_platform_admin', { p_user_id: row.user_id })
    if (error) { toast.error(error.message); return }
    toast.success('Acceso quitado')
    loadAdmins()
    onRowsChange(rows.map(r => r.user_id === row.user_id ? { ...r, is_platform_admin: false } : r))
  }

  const userRows = rows.filter(r => !r.is_platform_admin)

  async function handleRoleChange(row: UserRow, role: string) {
    const key = `${row.team_id}-${row.user_id}`
    setSavingKey(key)
    const { error } = await supabase.rpc('admin_set_team_member_role', { p_team_id: row.team_id, p_user_id: row.user_id, p_role: role })
    setSavingKey(null)
    if (error) { toast.error(error.message); return }
    onRowsChange(rows.map(r => (r.team_id === row.team_id && r.user_id === row.user_id) ? { ...r, role } : r))
    toast.success('Rol actualizado')
  }

  async function handleGrantFromRow(row: UserRow) {
    const { error } = await supabase.rpc('admin_grant_platform_admin', { p_email: row.email })
    if (error) { toast.error(error.message); return }
    toast.success(`${row.email} ahora es administrador de la plataforma`)
    onRowsChange(rows.map(r => r.user_id === row.user_id ? { ...r, is_platform_admin: true } : r))
    loadAdmins()
  }

  return (
    <div>
      <Card className="mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Administradores de la plataforma</p>
        <div className="flex gap-2 mb-3">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGrantAdmin() }}
            placeholder="Email del usuario ya registrado"
            type="email"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
          />
          <Button loading={granting} onClick={handleGrantAdmin}><Plus size={15} /> Dar acceso</Button>
        </div>
        {loadingAdmins ? (
          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {admins.map(a => (
              <div key={a.user_id} className="flex items-center gap-2 py-1.5">
                <ShieldCheck size={14} className="text-green-400 shrink-0" />
                <span className="text-sm text-white flex-1 truncate">{a.email}{a.user_id === currentUserId && ' (vos)'}</span>
                {a.user_id !== currentUserId && (
                  <button onClick={() => handleRevokeAdmin(a)} className="text-gray-600 hover:text-red-400 shrink-0" aria-label="Quitar acceso">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-gray-400 text-sm mb-4">
        Usuarios de la app — su rol, club, liga y categoría. Una persona puede aparecer más de una vez si juega en más de un club. Los administradores de la plataforma no se listan acá.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
      ) : userRows.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">Todavía no hay usuarios en ningún club.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="px-4 md:px-3 py-2 font-bold">Nombre</th>
                <th className="px-3 py-2 font-bold">Mail</th>
                <th className="px-3 py-2 font-bold">Club</th>
                <th className="px-3 py-2 font-bold">Liga</th>
                <th className="px-3 py-2 font-bold">Categoría</th>
                <th className="px-3 py-2 font-bold">Posición</th>
                <th className="px-3 py-2 font-bold">Tipo de usuario</th>
                <th className="px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {userRows.map(row => {
                const key = `${row.team_id}-${row.user_id}`
                return (
                  <tr key={key} className="border-b border-gray-800/50">
                    <td className="px-4 md:px-3 py-2.5 text-white font-semibold whitespace-nowrap">{row.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{row.email}</td>
                    <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">{row.team_name}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{row.league_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{row.category_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{row.player_position ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <select
                        value={row.role}
                        disabled={savingKey === key}
                        onChange={e => handleRoleChange(row, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleGrantFromRow(row)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: '#1f2937', color: '#6b7280' }}
                        title="Dar acceso de administrador de la plataforma"
                      >
                        <ShieldCheck size={12} /> Dar admin
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── ROOT PANEL ──────────────────────────────────────────────────────────────
export function AdminPanelPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [teams, setTeams] = useState<Team[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [userRows, setUserRows] = useState<UserRow[]>([])
  const [loadingUserRows, setLoadingUserRows] = useState(true)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    async function init() {
      if (!user || !isSupabaseConfigured) { setChecked(true); return }
      const { data: adminRow } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
      setIsPlatformAdmin(!!adminRow)
      setChecked(true)
      if (!adminRow) return

      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        .then(({ data }) => setDisplayName(data?.full_name || user.email?.split('@')[0] || ''))

      const [{ data: teamRows }, { data: leagueRows }] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('leagues').select('*').order('name'),
      ])
      setTeams(teamRows ?? [])
      setLeagues(leagueRows ?? [])
      setLoadingTeams(false)

      const teamIds = (teamRows ?? []).map(t => t.id)
      if (teamIds.length > 0) {
        const { data: catRows } = await supabase.from('categories').select('*').in('team_id', teamIds).order('name')
        setCategories(catRows ?? [])
      }

      const { data: userRowsData, error: userRowsError } = await supabase.rpc('admin_list_users')
      if (userRowsError) toast.error(userRowsError.message)
      setUserRows(userRowsData ?? [])
      setLoadingUserRows(false)
    }
    init()
  }, [user])

  async function refreshUserRows() {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) { toast.error(error.message); return }
    setUserRows(data ?? [])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (!checked) {
    return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-800 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
  }

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10">
        <EmptyState icon={<span className="text-5xl">🔒</span>} title="Sin acceso" description="Este panel es solo para el administrador de la plataforma." />
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: typeof Users2 }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'equipos', label: 'Equipos', icon: Users2 },
    { key: 'ligas', label: 'Ligas', icon: Trophy },
    { key: 'auspiciadores', label: 'Auspiciadores', icon: Megaphone },
    { key: 'rankings', label: 'Ranking', icon: BarChart3 },
    { key: 'usuarios', label: 'Usuarios', icon: UserCog },
  ]

  const currentLabel = TABS.find(t => t.key === tab)?.label ?? ''

  return (
    <div className="min-h-dvh flex" style={{ background: '#0b1220' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 border-r border-gray-800 px-4 py-6">
        <div className="flex items-center gap-2 mb-1 px-2">
          <span className="text-2xl">👑</span>
          <div>
            <p className="text-white font-bold leading-tight">TeamApp</p>
            <p className="text-gray-500 text-xs leading-tight">Panel interno</p>
          </div>
        </div>
        <p className="text-gray-600 text-[11px] px-2 mb-6">Gestión de la plataforma</p>
        <nav className="flex flex-col gap-1 flex-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors"
              style={tab === key ? { background: '#22c55e1a', color: '#22c55e' } : { color: '#9ca3af' }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left text-gray-500 hover:text-red-400">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </aside>

      {/* Mobile top selector */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 border-b border-gray-800 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">👑</span>
            <p className="text-white font-bold text-sm truncate">Hola{displayName ? `, ${displayName}` : ''}</p>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-gray-400 hover:text-red-400 text-xs font-semibold shrink-0">
            <LogOut size={14} /> Salir
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={tab === key ? { background: '#22c55e', color: '#030712' } : { background: '#1f2937', color: '#9ca3af' }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 md:px-8 pt-28 md:pt-8 pb-16 max-w-4xl">
        <div className="hidden md:flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">Hola{displayName ? `, ${displayName}` : ''} 👋</h1>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm font-semibold shrink-0">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6 hidden md:block">{currentLabel} — TeamApp gestión de la plataforma</p>
        <h1 className="text-2xl font-bold text-white mb-1 md:hidden">{currentLabel}</h1>

        {tab === 'dashboard' && <DashboardTab teams={teams} leagues={leagues} categories={categories} onGoTo={setTab} />}
        {tab === 'equipos' && <EquiposTab teams={teams} leagues={leagues} userRows={userRows} loading={loadingTeams} onTeamsChange={setTeams} onRefreshUsers={refreshUserRows} />}
        {tab === 'ligas' && <LigasTab leagues={leagues} onLeaguesChange={setLeagues} />}
        {tab === 'auspiciadores' && <AuspiciadoresTab teams={teams} leagues={leagues} categories={categories} onCategoriesChange={setCategories} />}
        {tab === 'rankings' && <RankingsPage embedded leagues={leagues} />}
        {tab === 'usuarios' && <UsuariosTab rows={userRows} loading={loadingUserRows} currentUserId={user?.id} onRowsChange={setUserRows} />}
      </main>
    </div>
  )
}
