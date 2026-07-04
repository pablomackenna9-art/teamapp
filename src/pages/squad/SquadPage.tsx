import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, FileSpreadsheet, X, Check, ChevronLeft, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { ExcelImport } from '@/components/ExcelImport'
import { SponsorBanner } from '@/components/SponsorBanner'
import { mockCategories } from '@/lib/mock'
import { useTeamStore } from '@/store/authStore'
import { useDemoStore, MAX_EXTRA_COORDINADORES } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import type { Player, PlayerResponsibility } from '@/types'
import toast from 'react-hot-toast'

const POSITIONS = ['Todos', 'Arquero', 'Defensor', 'Mediocampista', 'Delantero']

const POSITION_ABBR: Record<string, string> = {
  'Arquero': 'ARQ',
  'Defensor': 'DEF',
  'Mediocampista': 'MED',
  'Delantero': 'DEL',
}

const RESPONSIBILITY_META: Record<PlayerResponsibility, { label: string; color: string }> = {
  dt: { label: 'DT', color: '#a855f7' },
  tesorero: { label: 'TESORERO', color: '#eab308' },
  coordinador: { label: 'COORDINADOR', color: '#22c55e' },
}

// ── Assign responsibility sheet ────────────────────────────────────────────────
function ResponsibilitySheet({ player, players, teamColor, onClose, onSave }: {
  player: Player
  players: Player[]
  teamColor: string
  onClose: () => void
  onSave: (responsibility: PlayerResponsibility | null) => { ok: boolean; error?: string }
}) {
  const coordinadorCount = players.filter(p => p.responsibility === 'coordinador' && p.id !== player.id).length

  function choose(value: PlayerResponsibility | null) {
    const result = onSave(value)
    if (!result.ok) { toast.error(result.error ?? 'No se pudo asignar'); return }
    toast.success(value ? `${player.name} ahora es ${RESPONSIBILITY_META[value].label}` : 'Responsabilidad quitada')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-lg">Asignar responsabilidad</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-gray-500 text-sm mb-5">{player.name}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => choose(null)}
            className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
            style={!player.responsibility
              ? { background: teamColor + '20', borderColor: teamColor }
              : { background: '#111827', borderColor: '#1f2937' }
            }
          >
            <span className="text-sm font-semibold text-white flex-1">Sin responsabilidad especial</span>
            {!player.responsibility && <Check size={16} style={{ color: teamColor }} />}
          </button>

          {(['dt', 'tesorero', 'coordinador'] as PlayerResponsibility[]).map(key => {
            const meta = RESPONSIBILITY_META[key]
            const isCurrent = player.responsibility === key
            const disabled = key === 'coordinador' && !isCurrent && coordinadorCount >= MAX_EXTRA_COORDINADORES
            return (
              <button
                key={key}
                onClick={() => !disabled && choose(key)}
                disabled={disabled}
                className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all disabled:opacity-40"
                style={isCurrent
                  ? { background: meta.color + '20', borderColor: meta.color }
                  : { background: '#111827', borderColor: '#1f2937' }
                }
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '25' }}>
                  <ShieldCheck size={15} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  {key === 'coordinador' && (
                    <p className="text-gray-500 text-[11px]">
                      {disabled ? `Máximo ${MAX_EXTRA_COORDINADORES} coordinadores extra alcanzado` : `${coordinadorCount}/${MAX_EXTRA_COORDINADORES} asignados`}
                    </p>
                  )}
                </div>
                {isCurrent && <Check size={16} style={{ color: meta.color }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Quick add-player sheet ─────────────────────────────────────────────────────
function AddPlayerSheet({ teamColor, categories, onClose, onSave }: {
  teamColor: string
  categories: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: { name: string; position: string; number: string; category_id: string | null; email: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('Delantero')
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Ingresá el nombre del jugador'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), position, number, category_id: categoryId, email: email.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5 sm:max-h-[85vh] sm:overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Nuevo jugador</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Posición</p>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm outline-none"
              >
                {POSITIONS.filter(p => p !== 'Todos').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Número</p>
              <input
                value={number}
                onChange={e => setNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="10"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo electrónico (opcional)</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jugador@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none"
            />
            <p className="text-gray-600 text-[11px] mt-1.5">
              Cuando el jugador entre a la app con este correo, va a ver este equipo automáticamente.
            </p>
          </div>

          {categories.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</p>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className="text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
                    style={categoryId === cat.id
                      ? { background: teamColor, color: '#030712' }
                      : { background: '#1f2937', color: '#9ca3af' }
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button fullWidth loading={saving} onClick={handleSave}>
            <Check size={16} /> Agregar jugador
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SquadPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { memberRole, activeCategoryId, teamColor, currentTeamId, categories } = useTeamStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'captain' || memberRole === 'coordinador'
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const activeCategories = categories.length > 0 ? categories : mockCategories

  const demoPlayers = useDemoStore(s => s.players)
  const addDemoPlayer = useDemoStore(s => s.addPlayer)
  const addDemoPlayers = useDemoStore(s => s.addPlayers)
  const setDemoPlayerResponsibility = useDemoStore(s => s.setPlayerResponsibility)

  const [players, setPlayers] = useState<Player[]>(isDemo ? demoPlayers : [])
  const [loading, setLoading] = useState(!isDemo)

  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('Todos')
  const [showExcel, setShowExcel] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [assigningPlayer, setAssigningPlayer] = useState<Player | null>(null)
  const [catFilter, setCatFilter] = useState<string | 'all'>(activeCategoryId ?? 'all')

  async function loadPlayers() {
    if (isDemo) return // reactive via demoPlayers below
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', currentTeamId)
      .order('name')
    if (error) { toast.error('No se pudo cargar el plantel'); setLoading(false); return }
    setPlayers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (isDemo) { setPlayers(demoPlayers); setLoading(false); return }
    loadPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamId, isDemo, demoPlayers])

  const filtered = players.filter(p =>
    p.is_active &&
    (posFilter === 'Todos' || p.position === posFilter) &&
    (catFilter === 'all' || p.category_id === catFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAddPlayer(data: { name: string; position: string; number: string; category_id: string | null; email: string }) {
    if (isDemo) {
      addDemoPlayer({
        id: `demo-p-${Date.now()}`,
        team_id: 'mock-team-1',
        user_id: null,
        name: data.name,
        photo_url: null,
        position: data.position,
        number: data.number ? parseInt(data.number, 10) : null,
        category_id: data.category_id,
        is_active: true,
        created_at: new Date().toISOString(),
        email: data.email || null,
      })
      toast.success('Jugador agregado')
      return
    }
    const { data: player, error } = await supabase.from('players').insert({
      team_id: currentTeamId,
      name: data.name,
      position: data.position,
      number: data.number ? parseInt(data.number, 10) : null,
      category_id: data.category_id,
      is_active: true,
      email: data.email || null,
    }).select().single()
    if (error) { toast.error(error.message); return }
    if (data.email && player) {
      // Pending invite — claimed automatically the moment this email logs in
      const { error: inviteError } = await supabase.from('team_invites').insert({
        team_id: currentTeamId, email: data.email, role: 'player', player_id: player.id,
      })
      if (inviteError) toast.error('Jugador agregado, pero no se pudo vincular el correo: ' + inviteError.message)
    }
    toast.success('Jugador agregado')
    loadPlayers()
  }

  async function handleImport(imported: Array<{ name: string; position: string; number: string }>) {
    const categoryId = catFilter !== 'all' ? catFilter : (activeCategoryId ?? null)

    if (isDemo) {
      addDemoPlayers(imported.map((p, i) => ({
        id: `demo-p-${Date.now()}-${i}`,
        team_id: 'mock-team-1',
        user_id: null,
        name: p.name,
        photo_url: null,
        position: p.position || null,
        number: p.number ? parseInt(p.number, 10) : null,
        category_id: categoryId,
        is_active: true,
        created_at: new Date().toISOString(),
      })))
      toast.success(`${imported.length} jugadores agregados al plantel`)
      return
    }

    const rows = imported.map(p => ({
      team_id: currentTeamId,
      name: p.name,
      position: p.position || null,
      number: p.number ? parseInt(p.number, 10) : null,
      category_id: categoryId,
      is_active: true,
    }))
    const { error } = await supabase.from('players').insert(rows)
    if (error) { toast.error(error.message); return }
    toast.success(`${rows.length} jugadores agregados al plantel`)
    loadPlayers()
  }

  function handleAssignResponsibility(responsibility: PlayerResponsibility | null): { ok: boolean; error?: string } {
    if (!assigningPlayer) return { ok: false }

    if (isDemo) {
      return setDemoPlayerResponsibility(assigningPlayer.id, responsibility)
    }

    if (responsibility === 'coordinador') {
      const currentCount = players.filter(p => p.responsibility === 'coordinador' && p.id !== assigningPlayer.id).length
      if (currentCount >= MAX_EXTRA_COORDINADORES) {
        return { ok: false, error: `Ya asignaste el máximo de ${MAX_EXTRA_COORDINADORES} coordinadores extra` }
      }
    }

    supabase.from('players').update({ responsibility }).eq('id', assigningPlayer.id).then(({ error }) => {
      if (error) { toast.error(error.message); return }
      loadPlayers()
    })
    return { ok: true }
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-lg mx-auto">
      <div className="pt-4">
        <SponsorBanner sectionKey="squad" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors shrink-0 -ml-1">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">Plantel oficial {currentYear}</h1>
          <p className="text-sm text-gray-400">
            {loading ? 'Cargando...' : `${filtered.length} jugador${filtered.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExcel(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <FileSpreadsheet size={16} />
            </button>
            <Button size="sm" onClick={() => setShowAddPlayer(true)}>
              <Plus size={14} /> Jugador
            </Button>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCatFilter('all')}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
          style={catFilter === 'all'
            ? { background: teamColor, color: '#030712' }
            : { background: '#1f2937', color: '#9ca3af' }
          }
        >
          Todos
        </button>
        {activeCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCatFilter(cat.id)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
            style={catFilter === cat.id
              ? { background: teamColor, color: '#030712' }
              : { background: '#1f2937', color: '#9ca3af' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Position filter */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors border"
            style={posFilter === pos
              ? { borderColor: teamColor, color: teamColor, background: teamColor + '20' }
              : { borderColor: '#374151', color: '#6b7280', background: 'transparent' }
            }
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
        </div>
      </div>

      {/* Player grid */}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">👥</span>}
          title="Sin jugadores"
          description="No se encontraron jugadores con esos filtros"
          action={isAdmin ? (
            <Button size="sm" onClick={() => setShowExcel(true)}>
              <FileSpreadsheet size={14} /> Importar desde Excel
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {filtered.map(player => {
            const cat = activeCategories.find(c => c.id === player.category_id)
            return (
              <div
                key={player.id}
                className="rounded-2xl border border-gray-800 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(160deg, #111827 0%, #0f172a 100%)' }}
                onClick={() => navigate(`/team/${slug}/squad/${player.id}`)}
              >
                {/* Photo area */}
                <div
                  className="h-28 flex items-center justify-center relative"
                  style={{ background: teamColor + '15' }}
                >
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <Avatar name={player.name} size="xl" />
                  )}
                  {/* Number badge */}
                  {player.number && (
                    <span
                      className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-black flex items-center justify-center"
                      style={{ background: teamColor, color: '#030712' }}
                    >
                      {player.number}
                    </span>
                  )}
                  {/* Position badge */}
                  {player.position && (
                    <span
                      className="absolute bottom-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: '#00000080', color: teamColor }}
                    >
                      {POSITION_ABBR[player.position] ?? player.position.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                  {/* Assign responsibility — coordinador only */}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); setAssigningPlayer(player) }}
                      className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#00000080', color: player.responsibility ? RESPONSIBILITY_META[player.responsibility].color : '#9ca3af' }}
                    >
                      <ShieldCheck size={13} />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{player.name}</p>
                  {player.responsibility && (
                    <span
                      className="inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: RESPONSIBILITY_META[player.responsibility].color + '25', color: RESPONSIBILITY_META[player.responsibility].color }}
                    >
                      {RESPONSIBILITY_META[player.responsibility].label}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    {player.position && (
                      <p className="text-gray-500 text-[11px]">{player.position}</p>
                    )}
                    {cat && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: teamColor + '20', color: teamColor }}
                      >
                        {cat.name.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showExcel && (
        <ExcelImport onClose={() => setShowExcel(false)} onImport={handleImport} />
      )}

      {showAddPlayer && (
        <AddPlayerSheet
          teamColor={teamColor}
          categories={activeCategories}
          onClose={() => setShowAddPlayer(false)}
          onSave={handleAddPlayer}
        />
      )}

      {assigningPlayer && (
        <ResponsibilitySheet
          player={assigningPlayer}
          players={players}
          teamColor={teamColor}
          onClose={() => setAssigningPlayer(null)}
          onSave={handleAssignResponsibility}
        />
      )}
    </div>
  )
}
