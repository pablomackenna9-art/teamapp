import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, Users, FileText, ClipboardList, Lock, Unlock, Check, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { mockMatches, mockAttendance, mockPlayers, mockTeam } from '@/lib/mock'
import { formatDateTime } from '@/lib/utils'
import { useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { isMockId } from '@/lib/storage'
import type { AttendanceStatus, MatchType } from '@/types'
import toast from 'react-hot-toast'

// Demo stand-in for "who am I" — in real app this maps to the logged-in user's player row
const CURRENT_PLAYER_ID = 'p5'

// Seed a few votes already cast by teammates, keyed by voter player id (first run only)
const SEED_MVP_VOTES: Record<string, string> = {
  p1: 'p6',
  p2: 'p6',
  p3: 'p7',
  p4: 'p6',
  p7: 'p5',
  p8: 'p6',
  p9: 'p5',
  p10: 'p7',
}

type Tab = 'attendance' | 'mvp' | 'summary'

const ATTENDANCE_OPTIONS: { value: AttendanceStatus, label: string, color: string }[] = [
  { value: 'confirmed', label: '✅ Voy', color: '#22c55e' },
  { value: 'maybe', label: '🤔 Duda', color: '#f59e0b' },
  { value: 'absent', label: '❌ No voy', color: '#ef4444' },
]

// Sort order for the attendance list — confirmed players float to the top
const ATTENDANCE_ORDER: Record<AttendanceStatus, number> = {
  confirmed: 0,
  maybe: 1,
  no_response: 2,
  absent: 3,
}

// ── Edit upcoming match sheet — coordinadores can adjust type, date, rival, location ──
function EditMatchSheet({ match, teamColor, onClose, onSave }: {
  match: typeof mockMatches[0]
  teamColor: string
  onClose: () => void
  onSave: (patch: { rival: string; type: MatchType; date: string; location: string }) => void
}) {
  const [rival, setRival] = useState(match.rival)
  const [type, setType] = useState<MatchType>(match.type)
  const [date, setDate] = useState(match.date.slice(0, 16))
  const [location, setLocation] = useState(match.location ?? '')

  function handleSave() {
    if (!rival.trim()) { toast.error('Ingresá el rival'); return }
    onSave({ rival: rival.trim(), type, date: new Date(date).toISOString(), location: location.trim() })
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
              value={rival}
              onChange={e => setRival(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
            <div className="flex gap-2">
              {(['official', 'friendly'] as MatchType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors"
                  style={type === t
                    ? { background: teamColor + '25', borderColor: teamColor, color: teamColor }
                    : { background: 'transparent', borderColor: '#374151', color: '#6b7280' }
                  }
                >
                  {t === 'official' ? 'Oficial' : 'Amistoso'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha y hora</p>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ubicación</p>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
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
  const [tab, setTab] = useState<Tab>('attendance')
  const [showEdit, setShowEdit] = useState(false)
  const { teamColor, memberRole, currentTeamId } = useTeamStore()
  const isDT = memberRole === 'dt' || (isMockId(currentTeamId) && memberRole === 'admin')
  const isCoordinador = memberRole === 'admin' || memberRole === 'coordinador'

  const baseMatch = mockMatches.find(m => m.id === matchId) ?? mockMatches[0]
  const matchOverrides = useDemoStore(s => s.matchOverrides)
  const setMatchOverride = useDemoStore(s => s.setMatchOverride)
  const match = { ...baseMatch, ...matchOverrides[baseMatch.id] }

  // Attendance persists in the demo store, keyed per match+player, so marking
  // Voy/Duda/No voy immediately moves the player up/down the confirmed list and counts
  const attendanceByMatch = useDemoStore(s => s.attendanceByMatch)
  const setAttendanceDemo = useDemoStore(s => s.setAttendance)
  const attendanceOverrides = attendanceByMatch[match.id] ?? {}
  const attendance = mockAttendance.map(a => ({
    ...a,
    status: attendanceOverrides[a.player_id] ?? a.status,
  }))
  const myAttendance = attendance.find(a => a.player_id === CURRENT_PLAYER_ID)?.status ?? 'no_response'

  // MVP votes persist in the demo store so they survive reloads/logout
  const votesByMatch = useDemoStore(s => s.mvpVotesByMatch)
  const setMvpVote = useDemoStore(s => s.setMvpVote)
  const votingClosedByMatch = useDemoStore(s => s.votingClosedByMatch)
  const setVotingClosedDemo = useDemoStore(s => s.setVotingClosed)

  const mvpVotesByVoter = votesByMatch[match.id] ?? SEED_MVP_VOTES
  const votingClosed = votingClosedByMatch[match.id] ?? false

  const attendanceSummary = {
    confirmed: attendance.filter(a => a.status === 'confirmed').length,
    maybe: attendance.filter(a => a.status === 'maybe').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    no_response: attendance.filter(a => a.status === 'no_response').length,
  }

  function markMyAttendance(status: AttendanceStatus) {
    setAttendanceDemo(match.id, CURRENT_PLAYER_ID, status)
  }

  const myVote = mvpVotesByVoter[CURRENT_PLAYER_ID] ?? null
  const canVote = !votingClosed || isCoordinador

  function castVote(playerId: string) {
    if (votingClosed && !isCoordinador) { toast.error('La votación está cerrada'); return }
    setMvpVote(match.id, CURRENT_PLAYER_ID, playerId)
    toast.success(`Votaste a ${mockPlayers.find(p => p.id === playerId)?.name}`)
  }

  function toggleVotingClosed() {
    setVotingClosedDemo(match.id, !votingClosed)
    toast.success(votingClosed ? 'Votación reabierta' : 'Votación cerrada')
  }

  // Live tally computed from actual votes cast
  const mvpVotes = mockPlayers.map(p => ({
    player: p,
    votes: Object.values(mvpVotesByVoter).filter(v => v === p.id).length,
  })).sort((a, b) => b.votes - a.votes)

  // Who voted for whom (voter identity is visible to teammates)
  const voterEntries = Object.entries(mvpVotesByVoter)
    .map(([voterId, targetId]) => ({
      voter: mockPlayers.find(p => p.id === voterId),
      target: mockPlayers.find(p => p.id === targetId),
      isMe: voterId === CURRENT_PLAYER_ID,
    }))
    .filter(e => e.voter && e.target)

  const tabs = [
    { key: 'attendance' as Tab, label: 'Asistencia', icon: Users },
    { key: 'mvp' as Tab, label: 'MVP', icon: Star },
    { key: 'summary' as Tab, label: 'Resumen', icon: FileText },
  ]

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title={`vs ${match.rival}`} back />

      {/* Match header */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${teamColor}22, #1f2937)` }}>
        {isCoordinador && match.status === 'upcoming' && (
          <button
            onClick={() => setShowEdit(true)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
          >
            <Pencil size={13} />
          </button>
        )}

        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant={match.type === 'official' ? 'team' : 'default'}>
              {match.type === 'official' ? 'Oficial' : 'Amistoso'}
            </Badge>
            <span className="text-gray-500 text-xs">{formatDateTime(match.date)}</span>
          </div>

          {match.status === 'played' ? (
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">{mockTeam.name}</p>
                <p className="text-5xl font-black text-white">{match.home_score}</p>
              </div>
              <p className="text-gray-600 text-2xl">-</p>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">{match.rival}</p>
                <p className="text-5xl font-black text-white">{match.away_score}</p>
              </div>
            </div>
          ) : (
            <p className="text-white text-xl font-bold">{match.rival}</p>
          )}

          {match.location && (
            <p className="text-gray-500 text-xs mt-3">📍 {match.location}</p>
          )}

          {/* Quick attendance for upcoming */}
          {match.status === 'upcoming' && (
            <div className="flex gap-2 justify-center mt-4">
              {ATTENDANCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => markMyAttendance(opt.value)}
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
        {/* Attendance tab */}
        {tab === 'attendance' && (
          <div>
            {/* Armar equipo button — DT only */}
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

            {/* Summary chips */}
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
              {[...attendance].sort((a, b) => ATTENDANCE_ORDER[a.status] - ATTENDANCE_ORDER[b.status]).map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border transition-all"
                  style={{ borderColor: a.player_id === CURRENT_PLAYER_ID ? teamColor + '60' : '#1f2937' }}
                >
                  <Avatar name={a.player?.name ?? ''} size="sm" />
                  <p className="flex-1 text-sm text-white">
                    {a.player?.name}
                    {a.player_id === CURRENT_PLAYER_ID && <span className="text-gray-500"> (vos)</span>}
                  </p>
                  <span className="text-lg">
                    {a.status === 'confirmed' ? '✅' : a.status === 'absent' ? '❌' : a.status === 'maybe' ? '🤔' : '⬜'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MVP vote tab */}
        {tab === 'mvp' && (
          <div>
            {/* Coordinador: open/close voting control */}
            {isCoordinador && (
              <button
                onClick={toggleVotingClosed}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm mb-4 transition-opacity active:opacity-80"
                style={votingClosed
                  ? { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' }
                  : { background: teamColor, color: '#030712' }
                }
              >
                {votingClosed ? <Unlock size={16} /> : <Lock size={16} />}
                {votingClosed ? 'Reabrir votación' : 'Cerrar votación'}
              </button>
            )}

            {votingClosed && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
                <p className="text-gray-300 text-xs font-semibold">🔒 La votación está cerrada</p>
              </div>
            )}

            {/* My vote status */}
            <div className="text-center mb-4 p-4 rounded-2xl" style={{ background: teamColor + '18' }}>
              <Star size={28} style={{ color: teamColor }} className="mx-auto mb-2" />
              {myVote ? (
                <>
                  <p className="text-white font-bold text-sm">Votaste a {mockPlayers.find(p => p.id === myVote)?.name}</p>
                  {canVote && <p className="text-gray-400 text-xs mt-1">Podés cambiar tu voto tocando otro jugador abajo</p>}
                </>
              ) : (
                <p className="text-white font-bold text-sm">
                  {canVote ? 'Todavía no votaste — elegí un jugador abajo' : 'No emitiste voto y la votación ya cerró'}
                </p>
              )}
            </div>

            {/* Player picker */}
            <p className="text-gray-400 text-sm mb-2 font-medium">Elegí al mejor jugador del partido:</p>
            <div className="flex flex-col gap-2 mb-5">
              {mockPlayers.map(player => {
                const isMyPick = myVote === player.id
                return (
                  <button
                    key={player.id}
                    onClick={() => castVote(player.id)}
                    disabled={!canVote}
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

            {/* Live tally */}
            <p className="text-gray-400 text-sm mb-2 font-medium">Resultado {votingClosed ? 'final' : 'parcial'}:</p>
            <div className="flex flex-col gap-2 mb-5">
              {mvpVotes.filter(v => v.votes > 0).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Todavía no hay votos</p>
              ) : mvpVotes.filter(v => v.votes > 0).map(({ player, votes }, i) => (
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

            {/* Who voted for whom — transparency */}
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

        {/* Summary tab */}
        {tab === 'summary' && (
          <div>
            {match.summary ? (
              <Card>
                <p className="text-gray-300 text-sm leading-relaxed">{match.summary}</p>
              </Card>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No hay resumen cargado para este partido.</p>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <EditMatchSheet
          match={match}
          teamColor={teamColor}
          onClose={() => setShowEdit(false)}
          onSave={patch => setMatchOverride(match.id, patch)}
        />
      )}
    </div>
  )
}
