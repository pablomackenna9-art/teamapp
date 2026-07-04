import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { X, ShieldAlert, Check } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import type { AttendanceStatus, LineupSlot, Player } from '@/types'
import toast from 'react-hot-toast'

// ── Formations ────────────────────────────────────────────────────────────────

type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2'

interface PositionSlot {
  id: string
  label: string
  x: number // 0-100 percent of field width
  y: number // 0-100 percent of field height (0=goalkeeper end, 100=forward end)
}

const FORMATIONS: Record<Formation, PositionSlot[]> = {
  '4-4-2': [
    { id: 'gk', label: 'ARQ', x: 50, y: 8 },
    { id: 'lb', label: 'LI', x: 15, y: 28 },
    { id: 'cb1', label: 'DC', x: 35, y: 28 },
    { id: 'cb2', label: 'DC', x: 65, y: 28 },
    { id: 'rb', label: 'LD', x: 85, y: 28 },
    { id: 'lm', label: 'MC', x: 15, y: 53 },
    { id: 'cm1', label: 'MC', x: 37, y: 53 },
    { id: 'cm2', label: 'MC', x: 63, y: 53 },
    { id: 'rm', label: 'MC', x: 85, y: 53 },
    { id: 'st1', label: 'DEL', x: 35, y: 76 },
    { id: 'st2', label: 'DEL', x: 65, y: 76 },
  ],
  '4-3-3': [
    { id: 'gk', label: 'ARQ', x: 50, y: 8 },
    { id: 'lb', label: 'LI', x: 15, y: 28 },
    { id: 'cb1', label: 'DC', x: 35, y: 28 },
    { id: 'cb2', label: 'DC', x: 65, y: 28 },
    { id: 'rb', label: 'LD', x: 85, y: 28 },
    { id: 'cm1', label: 'MC', x: 25, y: 53 },
    { id: 'cm2', label: 'MC', x: 50, y: 53 },
    { id: 'cm3', label: 'MC', x: 75, y: 53 },
    { id: 'lw', label: 'EXT', x: 20, y: 76 },
    { id: 'st', label: 'DEL', x: 50, y: 80 },
    { id: 'rw', label: 'EXT', x: 80, y: 76 },
  ],
  '3-5-2': [
    { id: 'gk', label: 'ARQ', x: 50, y: 8 },
    { id: 'cb1', label: 'DC', x: 25, y: 28 },
    { id: 'cb2', label: 'DC', x: 50, y: 28 },
    { id: 'cb3', label: 'DC', x: 75, y: 28 },
    { id: 'lwb', label: 'CAR', x: 10, y: 53 },
    { id: 'cm1', label: 'MC', x: 30, y: 50 },
    { id: 'cm2', label: 'MC', x: 50, y: 50 },
    { id: 'cm3', label: 'MC', x: 70, y: 50 },
    { id: 'rwb', label: 'CAR', x: 90, y: 53 },
    { id: 'st1', label: 'DEL', x: 35, y: 76 },
    { id: 'st2', label: 'DEL', x: 65, y: 76 },
  ],
  '4-2-3-1': [
    { id: 'gk', label: 'ARQ', x: 50, y: 8 },
    { id: 'lb', label: 'LI', x: 15, y: 28 },
    { id: 'cb1', label: 'DC', x: 35, y: 28 },
    { id: 'cb2', label: 'DC', x: 65, y: 28 },
    { id: 'rb', label: 'LD', x: 85, y: 28 },
    { id: 'cdm1', label: 'MCD', x: 35, y: 46 },
    { id: 'cdm2', label: 'MCD', x: 65, y: 46 },
    { id: 'lam', label: 'MCO', x: 20, y: 65 },
    { id: 'cam', label: 'MCO', x: 50, y: 65 },
    { id: 'ram', label: 'MCO', x: 80, y: 65 },
    { id: 'st', label: 'DEL', x: 50, y: 80 },
  ],
  '5-3-2': [
    { id: 'gk', label: 'ARQ', x: 50, y: 8 },
    { id: 'lwb', label: 'CAR', x: 10, y: 28 },
    { id: 'cb1', label: 'DC', x: 28, y: 28 },
    { id: 'cb2', label: 'DC', x: 50, y: 28 },
    { id: 'cb3', label: 'DC', x: 72, y: 28 },
    { id: 'rwb', label: 'CAR', x: 90, y: 28 },
    { id: 'cm1', label: 'MC', x: 25, y: 55 },
    { id: 'cm2', label: 'MC', x: 50, y: 55 },
    { id: 'cm3', label: 'MC', x: 75, y: 55 },
    { id: 'st1', label: 'DEL', x: 35, y: 76 },
    { id: 'st2', label: 'DEL', x: 65, y: 76 },
  ],
}

const POSITION_GROUPS = ['Arquero', 'Defensor', 'Mediocampista', 'Delantero']
const POSITION_ABBR: Record<string, string> = {
  Arquero: 'ARQ', Defensor: 'DEF', Mediocampista: 'MED', Delantero: 'DEL',
}

// How far a player dot can be nudged off its formation slot, in percent of the pitch.
const DRAG_RANGE = 10

// ── Component ─────────────────────────────────────────────────────────────────

export function LineupPage() {
  const { matchId } = useParams()
  const { teamColor, memberRole, currentTeamId, fixtureMatches, updateFixtureMatch } = useTeamStore()
  // On the demo team, the admin account also previews DT-only tools so it can be shown to clients
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const isDT = memberRole === 'dt' || (isDemo && memberRole === 'admin')

  const match = fixtureMatches.find(m => m.id === matchId)

  const demoPlayers = useDemoStore(s => s.players)
  const [realPlayers, setRealPlayers] = useState<Player[]>([])
  useEffect(() => {
    if (isDemo || !currentTeamId || !match) return
    supabase.from('players').select('*').eq('team_id', currentTeamId).eq('category_id', match.category_id)
      .then(({ data }) => setRealPlayers(data ?? []))
  }, [isDemo, currentTeamId, match?.category_id])
  const allPlayers = isDemo ? demoPlayers.filter(p => p.category_id === match?.category_id) : realPlayers

  const demoAttendanceByMatch = useDemoStore(s => s.attendanceByMatch)
  const [realAttendance, setRealAttendance] = useState<Record<string, AttendanceStatus>>({})
  useEffect(() => {
    if (isDemo || !matchId) return
    supabase.from('fixture_match_attendance').select('*').eq('fixture_match_id', matchId)
      .then(({ data }) => {
        const map: Record<string, AttendanceStatus> = {}
        for (const row of data ?? []) map[row.player_id] = row.status
        setRealAttendance(map)
      })
  }, [isDemo, matchId])
  const attendanceMap = isDemo ? (demoAttendanceByMatch[matchId ?? ''] ?? {}) : realAttendance
  const confirmedIds = new Set(Object.entries(attendanceMap).filter(([, s]) => s === 'confirmed').map(([id]) => id))

  const [formation, setFormation] = useState<Formation>((match?.formation as Formation) || '4-4-2')
  const [lineup, setLineup] = useState<Record<string, LineupSlot>>(match?.lineup ?? {})
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pitchRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ slotId: string; moved: boolean } | null>(null)

  useEffect(() => {
    if (!match) return
    setFormation((match.formation as Formation) || '4-4-2')
    setLineup(match.lineup ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id])

  if (!isDT) {
    return (
      <div className="max-w-lg mx-auto pb-8">
        <PageHeader title="Formación" back />
        <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
          <ShieldAlert size={40} className="text-red-500" />
          <p className="text-white font-bold">Solo el DT puede armar la formación</p>
          <p className="text-gray-500 text-sm max-w-xs">
            Esta función está reservada para quien tenga asignado el rol de Director Técnico del equipo.
          </p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-lg mx-auto pb-8">
        <PageHeader title="Formación" back />
        <p className="text-gray-500 text-sm text-center py-12">No se encontró este partido.</p>
      </div>
    )
  }

  const assignedPlayerIds = new Set(Object.values(lineup).map(s => s.playerId))
  const benchPlayers = allPlayers.filter(p => !assignedPlayerIds.has(p.id))

  // Confirmed headcount by position group — helps the DT see what he has available
  const positionCounts = POSITION_GROUPS.map(pos => ({
    pos,
    count: allPlayers.filter(p => p.position === pos && confirmedIds.has(p.id)).length,
  }))

  const slots = FORMATIONS[formation]

  function assignPlayer(playerId: string) {
    if (!selectedSlot) return
    const newLineup = { ...lineup }
    for (const [slotId, slot] of Object.entries(newLineup)) {
      if (slot.playerId === playerId) delete newLineup[slotId]
    }
    newLineup[selectedSlot] = { playerId }
    setLineup(newLineup)
    setSelectedSlot(null)
  }

  function removeFromSlot(slotId: string) {
    const newLineup = { ...lineup }
    delete newLineup[slotId]
    setLineup(newLineup)
    if (selectedSlot === slotId) setSelectedSlot(null)
  }

  function handlePointerDown(e: React.PointerEvent, slotId: string) {
    if (!lineup[slotId]) return
    e.stopPropagation()
    dragState.current = { slotId, moved: false }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current
    if (!drag || !pitchRef.current) return
    const rect = pitchRef.current.getBoundingClientRect()
    const slot = slots.find(s => s.id === drag.slotId)
    if (!slot) return
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    let dx = px - slot.x
    let dy = py - slot.y
    dx = Math.max(-DRAG_RANGE, Math.min(DRAG_RANGE, dx))
    dy = Math.max(-DRAG_RANGE, Math.min(DRAG_RANGE, dy))
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true
    setLineup(prev => ({ ...prev, [drag.slotId]: { ...prev[drag.slotId], dx, dy } }))
  }

  function handlePointerUp(slotId: string) {
    const drag = dragState.current
    dragState.current = null
    if (drag && !drag.moved) {
      // Treat as a tap, not a drag — toggle selection like before
      setSelectedSlot(prev => prev === slotId ? null : slotId)
    }
  }

  const filledCount = Object.keys(lineup).length

  async function handleSaveFormation() {
    setSaving(true)
    updateFixtureMatch(matchId!, { formation, lineup })
    setSaving(false)
    toast.success('Formación guardada')
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title="Formación" back />

      {/* Confirmed headcount by position */}
      <div className="grid grid-cols-4 gap-2 px-4 pb-3">
        {positionCounts.map(({ pos, count }) => (
          <div key={pos} className="rounded-xl border border-gray-800 bg-gray-900 py-2 text-center">
            <p className="text-lg font-black text-white">{count}</p>
            <p className="text-gray-500 text-[9px] font-bold uppercase">{POSITION_ABBR[pos]}</p>
          </div>
        ))}
      </div>

      {/* Formation selector */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {(Object.keys(FORMATIONS) as Formation[]).map(f => (
          <button
            key={f}
            onClick={() => { setFormation(f); setLineup({}) }}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
            style={formation === f
              ? { background: teamColor, color: '#030712' }
              : { background: '#1f2937', color: '#9ca3af' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      <p className="text-gray-600 text-[11px] px-4 pb-2">
        Tocá un jugador en cancha para asignarlo, o arrastralo un poco para ajustar su posición exacta.
      </p>

      {/* Pitch */}
      <div className="mx-4 mb-4">
        <div
          ref={pitchRef}
          className="relative rounded-2xl overflow-hidden touch-none"
          style={{ background: '#1a3a1a', border: '2px solid #2d5a2d', aspectRatio: '9/13' }}
          onPointerMove={handlePointerMove}
        >
          {/* Field markings */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 140" preserveAspectRatio="none">
            <rect x="3" y="3" width="94" height="134" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <line x1="3" y1="70" x2="97" y2="70" stroke="#4ade80" strokeWidth="0.5" />
            <circle cx="50" cy="70" r="12" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <circle cx="50" cy="70" r="1" fill="#4ade80" />
            <rect x="22" y="3" width="56" height="22" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <rect x="22" y="115" width="56" height="22" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <rect x="34" y="3" width="32" height="10" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <rect x="34" y="127" width="32" height="10" fill="none" stroke="#4ade80" strokeWidth="0.5" />
            <circle cx="50" cy="20" r="1" fill="#4ade80" />
            <circle cx="50" cy="120" r="1" fill="#4ade80" />
          </svg>

          {/* Position slots */}
          {slots.map(slot => {
            const assigned = lineup[slot.id]
            const player = assigned ? allPlayers.find(p => p.id === assigned.playerId) : null
            const playerConfirmed = player ? confirmedIds.has(player.id) : false
            const isSelected = selectedSlot === slot.id
            const left = slot.x + (assigned?.dx ?? 0)
            const top = slot.y + (assigned?.dy ?? 0)

            return (
              <button
                key={slot.id}
                onPointerDown={e => handlePointerDown(e, slot.id)}
                onPointerUp={() => handlePointerUp(slot.id)}
                onClick={() => { if (!player) setSelectedSlot(isSelected ? null : slot.id) }}
                className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-90"
                style={{ left: `${left}%`, top: `${top}%`, touchAction: 'none' }}
              >
                {/* Circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    background: player
                      ? (isSelected ? '#fff' : (playerConfirmed ? teamColor : '#f59e0b'))
                      : (isSelected ? teamColor : '#ffffff20'),
                    borderColor: isSelected ? '#fff' : (player ? (playerConfirmed ? teamColor : '#f59e0b') : '#ffffff40'),
                    boxShadow: isSelected ? `0 0 12px ${teamColor}` : undefined,
                  }}
                >
                  {player ? (
                    <span className="text-[10px] font-black text-gray-950 leading-none">
                      {player.number ?? player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-white/60">{slot.label}</span>
                  )}
                </div>

                {/* Name */}
                <span
                  className="text-[8px] font-bold leading-tight text-center max-w-[44px] truncate drop-shadow"
                  style={{ color: player ? '#fff' : '#ffffff50' }}
                >
                  {player ? player.name.split(' ').slice(-1)[0] : slot.label}
                </span>

                {/* Remove button */}
                {player && isSelected && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFromSlot(slot.id) }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={8} color="#fff" />
                  </button>
                )}
              </button>
            )
          })}

          {/* Counter overlay */}
          <div
            className="absolute top-2 right-2 text-xs font-black px-2 py-1 rounded-full"
            style={{ background: '#00000060', color: filledCount === 11 ? teamColor : '#9ca3af' }}
          >
            {filledCount}/11
          </div>

          {/* Instructions */}
          {selectedSlot && (
            <div
              className="absolute bottom-2 left-2 right-2 text-center text-xs font-bold py-1.5 rounded-xl"
              style={{ background: teamColor + 'cc', color: '#030712' }}
            >
              Seleccioná un jugador abajo
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor }} />
            <span className="text-[10px] text-gray-500">Confirmado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-gray-500">No confirmado</span>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <button
          onClick={handleSaveFormation}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm disabled:opacity-60"
          style={{ background: teamColor, color: '#030712' }}
        >
          <Check size={16} /> {saving ? 'Guardando...' : 'Guardar formación'}
        </button>
      </div>

      {/* Player list */}
      <div className="px-4">
        <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
          Plantel completo — toca para asignar
        </p>

        <div className="flex flex-col gap-2">
          {allPlayers.map(player => {
            const isAssigned = assignedPlayerIds.has(player.id)
            const canAssign = selectedSlot && !isAssigned
            const confirmed = confirmedIds.has(player.id)

            return (
              <button
                key={player.id}
                onClick={() => canAssign ? assignPlayer(player.id) : undefined}
                disabled={isAssigned && !selectedSlot}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: isAssigned
                    ? (confirmed ? teamColor + '40' : '#f59e0b40')
                    : (canAssign ? teamColor : '#374151'),
                  background: isAssigned
                    ? (confirmed ? teamColor + '10' : '#f59e0b10')
                    : (canAssign ? teamColor + '15' : 'transparent'),
                  opacity: isAssigned && selectedSlot ? 0.4 : 1,
                }}
              >
                <Avatar name={player.name} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{player.name}</p>
                  <p className="text-gray-500 text-xs">{player.position ?? '—'}</p>
                </div>
                {!confirmed && (
                  <span className="text-[9px] font-black shrink-0 text-amber-500">NO CONF.</span>
                )}
                {player.number && (
                  <span
                    className="text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isAssigned ? teamColor + '30' : '#1f2937', color: isAssigned ? teamColor : '#6b7280' }}
                  >
                    {player.number}
                  </span>
                )}
                {isAssigned && (
                  <span className="text-[10px] font-black shrink-0" style={{ color: confirmed ? teamColor : '#f59e0b' }}>EN CANCHA</span>
                )}
                {canAssign && (
                  <span className="text-[10px] font-black shrink-0 text-white">→ PONER</span>
                )}
              </button>
            )
          })}
          {allPlayers.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No hay jugadores cargados en esta categoría.</p>
          )}
        </div>

        {/* Bench (not assigned) */}
        {filledCount > 0 && benchPlayers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-800">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Banco ({benchPlayers.length})</p>
            <div className="flex flex-wrap gap-2">
              {benchPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-800 bg-gray-900">
                  <span className="text-white text-xs font-medium">{p.name.split(' ').slice(-1)[0]}</span>
                  {p.number && <span className="text-[10px] text-gray-500">#{p.number}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
