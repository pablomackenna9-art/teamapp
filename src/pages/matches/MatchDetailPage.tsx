import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, Users, Goal, ClipboardList, Lock, Unlock, Check, Pencil, X, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { useTeamStore, useAuthStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import { ourMatches, ourScore, theirScore } from '@/lib/matches'
import { formatDateTime } from '@/lib/utils'
import type { AttendanceStatus, FixtureEventType, Player } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'events' | 'attendance' | 'mvp'

const ATTENDANCE_OPTIONS: { value: AttendanceStatus, label: string, color: string }[] = [
  { value: 'confirmed', label: '✅ Voy', color: '#22c55e' },
  { value: 'maybe', label: '🤔 Duda', color: '#f59e0b' },
  { value: 'absent', label: '❌ No voy', color: '#ef4444' },
]

const ATTENDANCE_ORDER: Record<AttendanceStatus, number> = {
  confirmed: 0, maybe: 1, no_response: 2, absent: 3,
}

const EVENT_META: Record<FixtureEventType, { label: string; emoji: string; color: string }> = {
  goal: { label: 'Goles', emoji: '⚽', color: '#22c55e' },
  assist: { label: 'Asistencias', emoji: '🅰️', color: '#3b82f6' },
  yellow_card: { label: 'Amarillas', emoji: '🟨', color: '#eab308' },
  red_card: { label: 'Rojas', emoji: '🟥', color: '#ef4444' },
}

interface DemoEvent { id: string; player_id: string; type: FixtureEventType }

// ── Edit upcoming match sheet — coordinadores can adjust rival, date, location ──
function EditMatchSheet({ rival, date, location, teamColor, onClose, onSave }: {
  rival: string; date: string; location: string; teamColor: string
  onClose: () => void
  onSave: (patch: { rival: string; date: string; location: string }) => void
}) {
  const [rivalName, setRivalName] = useState(rival)
  const [dateVal, setDateVal] = useState(date.slice(0, 16))
  const [locationVal, setLocationVal] = useState(location)

  function handleSave() {
    if (!rivalName.trim()) { toast.error('Ingresá el rival'); return }
    onSave({ rival: rivalName.trim(), date: new Date(dateVal).toISOString(), location: locationVal.trim() })
    toast.success('Partido actualizado')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Editar partido</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rival</p>
            <input
              value={rivalName}
              onChange={e => setRivalName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha y hora</p>
            <input
              type="datetime-local"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ubicación</p>
            <input
              value={locationVal}
              onChange={e => setLocationVal(e.target.value)}
              placeholder="Cancha Municipal"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mt-2"
            style={{ background: teamColor, color: '#030712' }}
          >
            <Check size={16} /> Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

export function MatchDetailPage() {
  const { slug, matchId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('events')
  const [showEdit, setShowEdit] = useState(false)
  const { teamColor, teamName, memberRole, currentTeamId, fixtureMatches, updateFixtureMatch } = useTeamStore()
  const { user } = useAuthStore()
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const isDT = memberRole === 'dt' || (isDemo && memberRole === 'admin')
  const isCoordinador = memberRole === 'admin' || memberRole === 'coordinador'

  const fixtureMatch = fixtureMatches.find(m => m.id === matchId)
  const display = fixtureMatch ? ourMatches([fixtureMatch], teamName)[0] : undefined

  // ── Players for this match's category ──────────────────────────────────────
  const demoPlayers = useDemoStore(s => s.players)
  const [realPlayers, setRealPlayers] = useState<Player[]>([])
  useEffect(() => {
    if (isDemo || !currentTeamId || !fixtureMatch) return
    supabase.from('players').select('*').eq('team_id', currentTeamId).eq('category_id', fixtureMatch.category_id)
      .then(({ data }) => setRealPlayers(data ?? []))
  }, [isDemo, currentTeamId, fixtureMatch?.category_id])
  const players = isDemo
    ? demoPlayers.filter(p => p.category_id === fixtureMatch?.category_id)
    : realPlayers

  const myPlayer = isDemo
    ? players.find(p => p.id === 'p5') ?? players[0]
    : players.find(p => p.user_id === user?.id)

  // ── Attendance ───────────────────────────────────────────────────────────────
  const demoAttendanceByMatch = useDemoStore(s => s.attendanceByMatch)
  const setDemoAttendance = useDemoStore(s => s.setAttendance)
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
  const attendanceList = players.map(p => ({ player: p, status: attendanceMap[p.id] ?? 'no_response' as AttendanceStatus }))
  const myAttendance = myPlayer ? (attendanceMap[myPlayer.id] ?? 'no_response') : 'no_response'

  async function markAttendance(playerId: string, status: AttendanceStatus) {
    if (isDemo) {
      setDemoAttendance(matchId!, playerId, status)
    } else {
      setRealAttendance(prev => ({ ...prev, [playerId]: status }))
      const { error } = await supabase.from('fixture_match_attendance')
        .upsert({ team_id: currentTeamId, fixture_match_id: matchId, player_id: playerId, status }, { onConflict: 'fixture_match_id,player_id' })
      if (error) toast.error(error.message)
    }
  }

  const attendanceSummary = {
    confirmed: attendanceList.filter(a => a.status === 'confirmed').length,
    maybe: attendanceList.filter(a => a.status === 'maybe').length,
    absent: attendanceList.filter(a => a.status === 'absent').length,
    no_response: attendanceList.filter(a => a.status === 'no_response').length,
  }

  // ── MVP voting ───────────────────────────────────────────────────────────────
  const demoVotesByMatch = useDemoStore(s => s.mvpVotesByMatch)
  const setDemoMvpVote = useDemoStore(s => s.setMvpVote)
  const demoVotingClosedByMatch = useDemoStore(s => s.votingClosedByMatch)
  const setDemoVotingClosed = useDemoStore(s => s.setVotingClosed)
  const [realVotes, setRealVotes] = useState<Record<string, string>>({})
  const [votingClosed, setVotingClosed] = useState(false)

  useEffect(() => {
    if (isDemo || !matchId) return
    supabase.from('fixture_match_mvp_votes').select('*').eq('fixture_match_id', matchId)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const row of data ?? []) map[row.voter_player_id] = row.target_player_id
        setRealVotes(map)
      })
  }, [isDemo, matchId])

  const votesByVoter = isDemo ? (demoVotesByMatch[matchId ?? ''] ?? {}) : realVotes
  const votingClosedFinal = isDemo ? (demoVotingClosedByMatch[matchId ?? ''] ?? false) : votingClosed
  const myVote = myPlayer ? (votesByVoter[myPlayer.id] ?? null) : null
  const canVote = !votingClosedFinal || isCoordinador

  async function castVote(targetId: string) {
    if (!myPlayer) { toast.error('No se encontró tu jugador en el plantel'); return }
    if (votingClosedFinal && !isCoordinador) { toast.error('La votación está cerrada'); return }
    if (isDemo) {
      setDemoMvpVote(matchId!, myPlayer.id, targetId)
    } else {
      setRealVotes(prev => ({ ...prev, [myPlayer.id]: targetId }))
      const { error } = await supabase.from('fixture_match_mvp_votes')
        .upsert({ team_id: currentTeamId, fixture_match_id: matchId, voter_player_id: myPlayer.id, target_player_id: targetId }, { onConflict: 'fixture_match_id,voter_player_id' })
      if (error) toast.error(error.message)
    }
    toast.success(`Votaste a ${players.find(p => p.id === targetId)?.name}`)
  }

  function toggleVotingClosed() {
    if (isDemo) {
      setDemoVotingClosed(matchId!, !votingClosedFinal)
    } else {
      setVotingClosed(v => !v)
    }
    toast.success(votingClosedFinal ? 'Votación reabierta' : 'Votación cerrada')
  }

  const mvpTally = players.map(p => ({
    player: p,
    votes: Object.values(votesByVoter).filter(v => v === p.id).length,
  })).sort((a, b) => b.votes - a.votes)

  const voterEntries = Object.entries(votesByVoter)
    .map(([voterId, targetId]) => ({
      voter: players.find(p => p.id === voterId),
      target: players.find(p => p.id === targetId),
      isMe: voterId === myPlayer?.id,
    }))
    .filter(e => e.voter && e.target)

  // ── Goals / assists / cards ──────────────────────────────────────────────────
  const demoEventsByMatch = useDemoStore(s => s.matchEventsByMatch)
  const addDemoEvent = useDemoStore(s => s.addMatchEvent)
  const removeDemoEvent = useDemoStore(s => s.removeMatchEvent)
  const [realEvents, setRealEvents] = useState<DemoEvent[]>([])

  async function loadRealEvents() {
    if (isDemo || !matchId) return
    const { data } = await supabase.from('fixture_match_events').select('*').eq('fixture_match_id', matchId)
    setRealEvents((data ?? []).map(e => ({ id: e.id, player_id: e.player_id, type: e.type })))
  }
  useEffect(() => { loadRealEvents() }, [isDemo, matchId])

  const events: DemoEvent[] = isDemo ? (demoEventsByMatch[matchId ?? ''] ?? []) : realEvents

  const [newEventPlayer, setNewEventPlayer] = useState<string>('')
  const [newEventType, setNewEventType] = useState<FixtureEventType>('goal')

  async function addEvent() {
    if (!newEventPlayer) { toast.error('Elegí un jugador'); return }
    if (isDemo) {
      addDemoEvent(matchId!, newEventPlayer, newEventType)
    } else {
      const { error } = await supabase.from('fixture_match_events').insert({
        team_id: currentTeamId, fixture_match_id: matchId, player_id: newEventPlayer, type: newEventType,
      })
      if (error) { toast.error(error.message); return }
      loadRealEvents()
    }
    toast.success('Evento agregado')
  }

  async function removeEvent(eventId: string) {
    if (isDemo) {
      removeDemoEvent(matchId!, eventId)
    } else {
      const { error } = await supabase.from('fixture_match_events').delete().eq('id', eventId)
      if (error) { toast.error(error.message); return }
      loadRealEvents()
    }
  }

  if (!fixtureMatch || !display) {
    return (
      <div className="max-w-lg mx-auto pb-8">
        <PageHeader title="Partido" back />
        <p className="text-gray-500 text-sm text-center py-12">No se encontró este partido.</p>
      </div>
    )
  }

  const os = ourScore(display)
  const ts = theirScore(display)

  const tabs = [
    { key: 'events' as Tab, label: 'Goles y tarjetas', icon: Goal },
    { key: 'attendance' as Tab, label: 'Asistencia', icon: Users },
    { key: 'mvp' as Tab, label: 'MVP', icon: Star },
  ]

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title={`vs ${display.rival}`} back />

      {/* Match header */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${teamColor}22, #1f2937)` }}>
        {isCoordinador && !display.played && (
          <button
            onClick={() => setShowEdit(true)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
          >
            <Pencil size={13} />
          </button>
        )}

        <div className="p-5 text-center">
          <span className="text-gray-500 text-xs">{formatDateTime(display.date)}</span>

          {display.played ? (
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">{teamName}</p>
                <p className="text-5xl font-black text-white">{os}</p>
              </div>
              <p className="text-gray-600 text-2xl">-</p>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">{display.rival}</p>
                <p className="text-5xl font-black text-white">{ts}</p>
              </div>
            </div>
          ) : (
            <p className="text-white text-xl font-bold mt-2">{display.rival}</p>
          )}

          {display.location && (
            <p className="text-gray-500 text-xs mt-3">📍 {display.location}</p>
          )}

          {/* Quick attendance for upcoming */}
          {!display.played && myPlayer && (
            <div className="flex gap-2 justify-center mt-4">
              {ATTENDANCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => markAttendance(myPlayer.id, opt.value)}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={myAttendance === opt.value
                    ? { background: opt.color, color: '#030712' }
                    : { background: '#374151', color: '#9ca3af' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* DT lineup button — upcoming matches */}
          {isDT && !display.played && (
            <button
              onClick={() => navigate(`/team/${slug}/matches/${matchId}/lineup`)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm mt-4 transition-opacity active:opacity-80"
              style={{ background: teamColor, color: '#030712' }}
            >
              <ClipboardList size={16} />
              Armar equipo y formación
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={tab === key
              ? { background: teamColor, color: '#030712' }
              : { background: '#1f2937', color: '#9ca3af' }
            }
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Events tab: goals / assists / cards */}
        {tab === 'events' && (
          <div>
            {isCoordinador && (
              <div className="mb-5 p-3 rounded-2xl border border-gray-800 bg-gray-900">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cargar evento</p>
                <div className="flex flex-col gap-2">
                  <select
                    value={newEventPlayer}
                    onChange={e => setNewEventPlayer(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                  >
                    <option value="">Elegí un jugador...</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(EVENT_META) as FixtureEventType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setNewEventType(t)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border transition-colors"
                        style={newEventType === t
                          ? { background: EVENT_META[t].color + '25', borderColor: EVENT_META[t].color, color: EVENT_META[t].color }
                          : { background: 'transparent', borderColor: '#374151', color: '#6b7280' }
                        }
                      >
                        {EVENT_META[t].emoji} {EVENT_META[t].label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={addEvent}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold mt-1"
                    style={{ background: teamColor, color: '#030712' }}
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>
              </div>
            )}

            {(Object.keys(EVENT_META) as FixtureEventType[]).map(type => {
              const typeEvents = events.filter(e => e.type === type)
              if (typeEvents.length === 0) return null
              const meta = EVENT_META[type]
              return (
                <div key={type} className="mb-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                    {meta.emoji} {meta.label}
                  </p>
                  <div className="flex flex-col gap-2">
                    {typeEvents.map(e => {
                      const player = players.find(p => p.id === e.player_id)
                      return (
                        <div key={e.id} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
                          <Avatar name={player?.name ?? '?'} size="sm" />
                          <p className="flex-1 text-sm text-white">{player?.name ?? 'Jugador'}</p>
                          {isCoordinador && (
                            <button onClick={() => removeEvent(e.id)} className="text-gray-600 hover:text-red-400">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {events.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                {isCoordinador ? 'Todavía no cargaste goles, asistencias ni tarjetas.' : 'Sin eventos cargados para este partido.'}
              </p>
            )}
          </div>
        )}

        {/* Attendance tab */}
        {tab === 'attendance' && (
          <div>
            {isDT && (
              <button
                onClick={() => navigate(`/team/${slug}/matches/${matchId}/lineup`)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm mb-4 transition-opacity active:opacity-80"
                style={{ background: teamColor, color: '#030712' }}
              >
                <ClipboardList size={16} />
                Armar equipo y formación
              </button>
            )}

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Confirmados', value: attendanceSummary.confirmed, color: '#22c55e' },
                { label: 'Duda', value: attendanceSummary.maybe, color: '#f59e0b' },
                { label: 'Ausentes', value: attendanceSummary.absent, color: '#ef4444' },
                { label: 'Sin resp.', value: attendanceSummary.no_response, color: '#6b7280' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-900 rounded-xl p-2 text-center border border-gray-800">
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {[...attendanceList].sort((a, b) => ATTENDANCE_ORDER[a.status] - ATTENDANCE_ORDER[b.status]).map(a => (
                <div
                  key={a.player.id}
                  className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border transition-all"
                  style={{ borderColor: a.player.id === myPlayer?.id ? teamColor + '60' : '#1f2937' }}
                >
                  <Avatar name={a.player.name} size="sm" />
                  <p className="flex-1 text-sm text-white">
                    {a.player.name}
                    {a.player.id === myPlayer?.id && <span className="text-gray-500"> (vos)</span>}
                  </p>
                  {isCoordinador ? (
                    <div className="flex gap-1">
                      {ATTENDANCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => markAttendance(a.player.id, opt.value)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: a.status === opt.value ? opt.color + '30' : 'transparent', border: `1px solid ${a.status === opt.value ? opt.color : '#374151'}` }}
                        >
                          {opt.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-lg">
                      {a.status === 'confirmed' ? '✅' : a.status === 'absent' ? '❌' : a.status === 'maybe' ? '🤔' : '⬜'}
                    </span>
                  )}
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No hay jugadores cargados en esta categoría.</p>
              )}
            </div>
          </div>
        )}

        {/* MVP vote tab */}
        {tab === 'mvp' && (
          <div>
            {isCoordinador && (
              <button
                onClick={toggleVotingClosed}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm mb-4 transition-opacity active:opacity-80"
                style={votingClosedFinal
                  ? { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' }
                  : { background: teamColor, color: '#030712' }
                }
              >
                {votingClosedFinal ? <Unlock size={16} /> : <Lock size={16} />}
                {votingClosedFinal ? 'Reabrir votación' : 'Cerrar votación'}
              </button>
            )}

            {votingClosedFinal && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
                <p className="text-gray-300 text-xs font-semibold">🔒 La votación está cerrada</p>
              </div>
            )}

            {!myPlayer && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
                <p className="text-gray-400 text-xs">No tenés un jugador vinculado a tu cuenta en esta categoría, así que no podés votar — pero podés ver los resultados.</p>
              </div>
            )}

            <div className="text-center mb-4 p-4 rounded-2xl" style={{ background: teamColor + '18' }}>
              <Star size={28} style={{ color: teamColor }} className="mx-auto mb-2" />
              {myVote ? (
                <>
                  <p className="text-white font-bold text-sm">Votaste a {players.find(p => p.id === myVote)?.name}</p>
                  {canVote && <p className="text-gray-400 text-xs mt-1">Podés cambiar tu voto tocando otro jugador abajo</p>}
                </>
              ) : (
                <p className="text-white font-bold text-sm">
                  {canVote ? 'Todavía no votaste — elegí un jugador abajo' : 'No emitiste voto y la votación ya cerró'}
                </p>
              )}
            </div>

            <p className="text-gray-400 text-sm mb-2 font-medium">Elegí al mejor jugador del partido:</p>
            <div className="flex flex-col gap-2 mb-5">
              {players.map(player => {
                const isMyPick = myVote === player.id
                return (
                  <button
                    key={player.id}
                    onClick={() => castVote(player.id)}
                    disabled={!canVote || !myPlayer}
                    className="flex items-center gap-3 rounded-xl p-3 border w-full text-left active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                    style={isMyPick
                      ? { background: teamColor + '20', borderColor: teamColor }
                      : { background: '#111827', borderColor: '#1f2937' }
                    }
                  >
                    <Avatar name={player.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{player.name}</p>
                      <p className="text-gray-500 text-xs">{player.position}</p>
                    </div>
                    {isMyPick ? (
                      <Check size={16} style={{ color: teamColor }} />
                    ) : (
                      <Star size={16} className="text-gray-600" />
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-gray-400 text-sm mb-2 font-medium">Resultado {votingClosedFinal ? 'final' : 'parcial'}:</p>
            <div className="flex flex-col gap-2 mb-5">
              {mvpTally.filter(v => v.votes > 0).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Todavía no hay votos</p>
              ) : mvpTally.filter(v => v.votes > 0).map(({ player, votes }, i) => (
                <div key={player.id} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
                  <span className="text-gray-600 font-mono text-sm w-5">{i + 1}</span>
                  <Avatar name={player.name} size="sm" />
                  <p className="flex-1 text-sm text-white">{player.name}</p>
                  <div className="flex items-center gap-1">
                    <Star size={13} style={{ color: teamColor }} fill={teamColor} />
                    <span className="text-white font-bold text-sm">{votes}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-400 text-sm mb-2 font-medium">Quién votó a quién:</p>
            <div className="flex flex-col gap-2">
              {voterEntries.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Sin votos registrados</p>
              ) : voterEntries.map(({ voter, target, isMe }) => (
                <div
                  key={voter!.id}
                  className="flex items-center gap-2 bg-gray-900 rounded-xl p-2.5 border border-gray-800 text-xs"
                >
                  <Avatar name={voter!.name} size="sm" />
                  <span className="text-white font-medium">{isMe ? 'Vos' : voter!.name}</span>
                  <span className="text-gray-600">votó a</span>
                  <span className="font-semibold ml-auto" style={{ color: teamColor }}>{target!.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <EditMatchSheet
          rival={display.rival}
          date={display.date}
          location={display.location ?? ''}
          teamColor={teamColor}
          onClose={() => setShowEdit(false)}
          onSave={patch => {
            const isWeAreHome = display.weWereHome
            updateFixtureMatch(fixtureMatch.id, {
              ...(isWeAreHome ? { away_team: patch.rival } : { home_team: patch.rival }),
              date: patch.date,
              location: patch.location,
            })
          }}
        />
      )}
    </div>
  )
}
