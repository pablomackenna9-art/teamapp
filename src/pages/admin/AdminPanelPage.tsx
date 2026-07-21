import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shield, Trash2, X, AlertTriangle, Megaphone, ImagePlus, Check, Trophy, Users2, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { uploadTeamPhoto } from '@/lib/storage'
import { RankingsPage } from '@/pages/rankings/RankingsPage'
import type { Team, Category, League } from '@/types'

type Tab = 'equipos' | 'ligas' | 'auspiciadores' | 'rankings'

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

// ── EQUIPOS TAB ─────────────────────────────────────────────────────────────
function EquiposTab({ teams, leagues, loading, onTeamsChange }: {
  teams: Team[]; leagues: League[]; loading: boolean; onTeamsChange: (teams: Team[]) => void
}) {
  const navigate = useNavigate()
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sponsorTeam, setSponsorTeam] = useState<Team | null>(null)
  const [leagueTeam, setLeagueTeam] = useState<Team | null>(null)

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
    return (
      <Card key={team.id} onClick={() => navigate(`/team/${team.slug}`)} className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: team.primary_color + '26', color: team.primary_color }}>
          {team.logo_url ? <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover" /> : team.name[0]}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">{team.name}</p>
          <p className="text-gray-500 text-sm truncate">/{team.slug}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
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

// ── AUSPICIADORES TAB ───────────────────────────────────────────────────────
function AuspiciadoresTab({ teams }: { teams: Team[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleTeam(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    setSelected(prev => prev.size === teams.length ? new Set() : new Set(teams.map(t => t.id)))
  }

  async function handleApply() {
    if (!file) { toast.error('Elegí una imagen'); return }
    if (!categoryName.trim()) { toast.error('Escribí el nombre de la categoría (ej: Senior)'); return }
    if (selected.size === 0) { toast.error('Elegí al menos un equipo'); return }
    setApplying(true)
    try {
      const url = await uploadTeamPhoto(file, `bulk-sponsors/${Date.now()}`)
      const ids = Array.from(selected)
      const { data: matching, error: fetchError } = await supabase
        .from('categories').select('id, team_id, name').in('team_id', ids).ilike('name', categoryName.trim())
      if (fetchError) throw fetchError
      if (!matching || matching.length === 0) {
        toast.error(`Ningún club seleccionado tiene una categoría llamada "${categoryName.trim()}"`)
        setApplying(false)
        return
      }
      const { error } = await supabase.from('categories').update({ sponsor_url: url }).in('id', matching.map(c => c.id))
      if (error) throw error
      const skipped = ids.length - new Set(matching.map(c => c.team_id)).size
      toast.success(`Auspiciador aplicado a "${categoryName.trim()}" en ${matching.length} club${matching.length !== 1 ? 'es' : ''}` + (skipped > 0 ? ` (${skipped} sin esa categoría, omitidos)` : ''))
      setFile(null); setPreview(null); setCategoryName(''); setSelected(new Set())
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo aplicar el auspiciador')
    }
    setApplying(false)
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        Subí una imagen y aplicala a la categoría con este nombre (ej: "Senior") en varios clubes a la vez. Para un solo club, usá el ícono de auspiciador en la pestaña Equipos.
      </p>

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-gray-700 bg-black mb-4" style={{ height: 100 }}>
          <img src={preview} alt="Auspiciador" className="w-full h-full object-cover" />
          <button onClick={() => { setFile(null); setPreview(null) }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-6 w-full rounded-2xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 mb-4">
          <ImagePlus size={22} />
          <span className="text-xs font-semibold">Elegí una imagen</span>
          <span className="text-[11px] text-gray-600">Recomendado: 1200×275px, banner ancho ya recortado</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }} />

      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría (nombre exacto)</p>
      <input
        value={categoryName}
        onChange={e => setCategoryName(e.target.value)}
        placeholder="Ej: Senior"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none mb-4"
      />

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Elegí los clubes</p>
        <button onClick={toggleAll} className="text-xs font-semibold" style={{ color: '#22c55e' }}>
          {selected.size === teams.length ? 'Ninguno' : 'Todos'}
        </button>
      </div>
      <div className="flex flex-col gap-1.5 mb-4">
        {teams.map(team => {
          const isSelected = selected.has(team.id)
          return (
            <button key={team.id} onClick={() => toggleTeam(team.id)} className="flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
              style={isSelected ? { background: '#22c55e20', borderColor: '#22c55e' } : { background: '#111827', borderColor: '#1f2937' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2" style={isSelected ? { background: '#22c55e', borderColor: '#22c55e' } : { borderColor: '#374151' }}>
                {isSelected && <Check size={13} color="#030712" />}
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden" style={{ background: team.primary_color + '26', color: team.primary_color }}>
                {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-cover" /> : team.name[0]}
              </div>
              <span className="text-sm font-semibold text-white truncate">{team.name}</span>
            </button>
          )
        })}
        {teams.length === 0 && <p className="text-gray-600 text-sm text-center py-4">No hay clubes reales todavía.</p>}
      </div>

      <Button fullWidth loading={applying} onClick={handleApply}>
        Aplicar a {selected.size} club{selected.size !== 1 ? 'es' : ''}
      </Button>
    </div>
  )
}

// ── ROOT PANEL ──────────────────────────────────────────────────────────────
export function AdminPanelPage() {
  const { user } = useAuthStore()
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('equipos')
  const [teams, setTeams] = useState<Team[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    async function init() {
      if (!user || !isSupabaseConfigured) { setChecked(true); return }
      const { data: adminRow } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
      setIsPlatformAdmin(!!adminRow)
      setChecked(true)
      if (!adminRow) return

      const [{ data: teamRows }, { data: leagueRows }] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('leagues').select('*').order('name'),
      ])
      setTeams(teamRows ?? [])
      setLeagues(leagueRows ?? [])
      setLoadingTeams(false)
    }
    init()
  }, [user])

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
    { key: 'equipos', label: 'Equipos', icon: Users2 },
    { key: 'ligas', label: 'Ligas', icon: Trophy },
    { key: 'auspiciadores', label: 'Auspiciadores', icon: Megaphone },
    { key: 'rankings', label: 'Rankings', icon: BarChart3 },
  ]

  return (
    <div className="min-h-dvh max-w-2xl mx-auto px-4 pt-10 pb-16">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-2xl">👑</span>
        <h1 className="text-2xl font-bold text-white">Panel de administrador</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">TeamApp — gestión de la plataforma</p>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar border-b border-gray-800 pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 transition-colors"
            style={tab === key ? { borderColor: '#22c55e', color: '#22c55e' } : { borderColor: 'transparent', color: '#6b7280' }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'equipos' && <EquiposTab teams={teams} leagues={leagues} loading={loadingTeams} onTeamsChange={setTeams} />}
      {tab === 'ligas' && <LigasTab leagues={leagues} onLeaguesChange={setLeagues} />}
      {tab === 'auspiciadores' && <AuspiciadoresTab teams={teams} />}
      {tab === 'rankings' && <RankingsPage embedded leagues={leagues} />}
    </div>
  )
}
