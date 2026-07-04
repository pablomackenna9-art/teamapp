import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { mockCategories } from '@/lib/mock'
import { useTeamStore } from '@/store/authStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Check, Plus, FileSpreadsheet, Trash2 } from 'lucide-react'
import { FixtureExcelImport } from '@/components/FixtureExcelImport'
import { SponsorBanner } from '@/components/SponsorBanner'
import type { FixtureMatch } from '@/types'
import toast from 'react-hot-toast'

function formatDate(d: string) {
  return format(new Date(d), "EEE dd MMM", { locale: es })
}

interface ResultModalProps {
  match: FixtureMatch
  teamColor: string
  onSave: (hs: number, as_: number) => void
  onClose: () => void
}

function ResultModal({ match, teamColor, onSave, onClose }: ResultModalProps) {
  const [hs, setHs] = useState(match.home_score ?? 0)
  const [as_, setAs] = useState(match.away_score ?? 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-6 pb-10 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold">Cargar resultado</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <p className="text-gray-400 text-sm text-center mb-5">
          {match.home_team} vs {match.away_team}
        </p>

        <div className="flex items-center justify-center gap-6">
          {/* Home score */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 font-bold uppercase">{match.home_team}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHs(v => Math.max(0, v - 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 text-white text-xl font-bold flex items-center justify-center"
              >-</button>
              <span className="text-5xl font-black text-white w-12 text-center">{hs}</span>
              <button
                onClick={() => setHs(v => v + 1)}
                className="w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center"
                style={{ background: teamColor, color: '#030712' }}
              >+</button>
            </div>
          </div>

          <span className="text-gray-600 text-2xl font-bold mt-6">-</span>

          {/* Away score */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 font-bold uppercase">{match.away_team}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAs(v => Math.max(0, v - 1))}
                className="w-10 h-10 rounded-xl bg-gray-800 text-white text-xl font-bold flex items-center justify-center"
              >-</button>
              <span className="text-5xl font-black text-white w-12 text-center">{as_}</span>
              <button
                onClick={() => setAs(v => v + 1)}
                className="w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center"
                style={{ background: teamColor, color: '#030712' }}
              >+</button>
            </div>
          </div>
        </div>

        <button
          onClick={() => { onSave(hs, as_); onClose() }}
          className="mt-8 w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: teamColor, color: '#030712' }}
        >
          <Check size={16} /> Guardar resultado
        </button>
      </div>
    </div>
  )
}

interface DraftMatch { homeTeam: string; awayTeam: string; date: string }

function AddRoundSheet({ round, teamColor, onClose, onSave }: {
  round: number
  teamColor: string
  onClose: () => void
  onSave: (matches: DraftMatch[]) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [drafts, setDrafts] = useState<DraftMatch[]>([{ homeTeam: '', awayTeam: '', date: today }])

  function updateDraft(i: number, patch: Partial<DraftMatch>) {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  function addRow() {
    setDrafts(prev => [...prev, { homeTeam: '', awayTeam: '', date: prev[prev.length - 1]?.date ?? today }])
  }

  function removeRow(i: number) {
    setDrafts(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    const valid = drafts.filter(d => d.homeTeam.trim() && d.awayTeam.trim())
    if (valid.length === 0) { toast.error('Completá al menos un partido'); return }

    // Each team can only play once per jornada
    const seen = new Map<string, string>()
    for (const d of valid) {
      for (const team of [d.homeTeam.trim(), d.awayTeam.trim()]) {
        const key = team.toLowerCase()
        if (seen.has(key)) {
          toast.error(`"${team}" ya está jugando otro partido en esta jornada`)
          return
        }
        seen.set(key, team)
      }
    }

    onSave(valid)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5 max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="text-white font-bold text-lg">Jornada {round}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
          {drafts.map((d, i) => (
            <div key={i} className="rounded-2xl border border-gray-800 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={d.homeTeam}
                  onChange={e => updateDraft(i, { homeTeam: e.target.value })}
                  placeholder="Equipo local"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
                />
                <span className="text-gray-600 text-xs shrink-0">vs</span>
                <input
                  value={d.awayTeam}
                  onChange={e => updateDraft(i, { awayTeam: e.target.value })}
                  placeholder="Equipo visitante"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={d.date}
                  onChange={e => updateDraft(i, { date: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none"
                />
                {drafts.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-300 shrink-0 p-1.5">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 text-xs font-semibold"
          >
            <Plus size={14} /> Agregar otro partido a esta jornada
          </button>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shrink-0"
          style={{ background: teamColor, color: '#030712' }}
        >
          <Check size={16} /> Guardar jornada
        </button>
      </div>
    </div>
  )
}

export function FixturePage() {
  const { teamColor, teamName, activeCategoryId, categories, fixtureMatches, setMatchResult, addFixtureMatches, memberRole } = useTeamStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'captain' || memberRole === 'coordinador'

  const activeCategories = categories.length > 0 ? categories : mockCategories
  const [selectedCatId, setSelectedCatId] = useState(activeCategoryId ?? activeCategories[0]?.id ?? '')
  const [editingMatch, setEditingMatch] = useState<FixtureMatch | null>(null)
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showAddRound, setShowAddRound] = useState(false)

  const catMatches = fixtureMatches
    .filter(m => m.category_id === selectedCatId)
    .sort((a, b) => a.round - b.round || new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group by round
  const rounds: Record<number, FixtureMatch[]> = {}
  for (const m of catMatches) {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  }
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const nextRound = (roundNumbers[roundNumbers.length - 1] ?? 0) + 1

  function handleSaveRound(drafts: DraftMatch[]) {
    const newMatches: FixtureMatch[] = drafts.map((d, i) => ({
      id: `fx-round-${Date.now()}-${i}`,
      category_id: selectedCatId,
      round: nextRound,
      home_team: d.homeTeam.trim(),
      away_team: d.awayTeam.trim(),
      date: new Date(d.date).toISOString(),
      home_score: null,
      away_score: null,
      played: false,
    }))
    addFixtureMatches(newMatches)
    toast.success(`Jornada ${nextRound} agregada con ${newMatches.length} partido${newMatches.length !== 1 ? 's' : ''}`)
  }

  function resultColor(m: FixtureMatch) {
    if (!m.played || m.home_score === null) return null
    const hs = m.home_score!, as_ = m.away_score!
    const isMaestros = (team: string) => team === 'Maestros' || team === (teamName || 'Maestros')
    if (isMaestros(m.home_team)) return hs > as_ ? '#22c55e' : hs < as_ ? '#ef4444' : '#f59e0b'
    if (isMaestros(m.away_team)) return as_ > hs ? '#22c55e' : as_ < hs ? '#ef4444' : '#f59e0b'
    return '#6b7280'
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader
        title="Fixture"
        back
        action={isAdmin && (
          <button
            onClick={() => setShowExcelImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: teamColor + '20', color: teamColor }}
          >
            <FileSpreadsheet size={14} /> Importar Excel
          </button>
        )}
      />

      <div className="mb-3">
        <SponsorBanner sectionKey="fixture" />
      </div>

      {isAdmin && (
        <p className="text-gray-500 text-xs px-4 pb-3">
          Tocá cualquier partido para cargar el resultado — de tu equipo o de cualquier otro club de la liga.
          La tabla de posiciones se actualiza sola.
        </p>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {activeCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold"
            style={selectedCatId === cat.id
              ? { background: teamColor, color: '#030712' }
              : { background: '#1f2937', color: '#9ca3af' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Rounds */}
      <div className="px-4 flex flex-col gap-4">
        {roundNumbers.map(round => (
          <div key={round}>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: teamColor + '30', color: teamColor }}
              >
                {round}
              </div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Jornada {round}</span>
              <div className="flex-1 h-px bg-gray-800" />
              {rounds[round][0] && (
                <span className="text-[10px] text-gray-600">{formatDate(rounds[round][0].date)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {rounds[round].map(match => {
                const rc = resultColor(match)
                const played = match.played && match.home_score !== null

                return (
                  <button
                    key={match.id}
                    onClick={() => isAdmin && setEditingMatch(match)}
                    disabled={!isAdmin}
                    className="flex items-center gap-2 p-3.5 rounded-2xl border text-left transition-all active:scale-98"
                    style={{
                      background: '#0d1117',
                      borderColor: rc ? rc + '40' : '#1f2937',
                    }}
                  >
                    {/* Home team */}
                    <div className="flex-1 text-right min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: match.home_team === 'Maestros' || match.home_team === teamName ? teamColor : '#f9fafb' }}
                      >
                        {match.home_team}
                      </p>
                    </div>

                    {/* Score */}
                    <div
                      className="shrink-0 px-3 py-1.5 rounded-xl min-w-[70px] text-center"
                      style={{
                        background: played ? (rc ? rc + '20' : '#1f2937') : '#1f2937',
                        border: `1px solid ${played ? (rc ? rc + '50' : '#374151') : '#374151'}`,
                      }}
                    >
                      {played ? (
                        <span className="text-base font-black text-white">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-600">vs</span>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: match.away_team === 'Maestros' || match.away_team === teamName ? teamColor : '#f9fafb' }}
                      >
                        {match.away_team}
                      </p>
                    </div>

                    {/* Admin edit hint */}
                    {isAdmin && (
                      <span
                        className="text-[9px] font-bold shrink-0 px-2 py-1 rounded-lg"
                        style={played
                          ? { background: '#37415150', color: '#9ca3af' }
                          : { background: teamColor + '20', color: teamColor }
                        }
                      >
                        {played ? 'Editar' : 'Cargar'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {roundNumbers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-sm mb-4">No hay fixture cargado para esta categoría</p>
            {isAdmin && (
              <button
                onClick={() => setShowExcelImport(true)}
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl"
                style={{ background: teamColor + '20', color: teamColor }}
              >
                <FileSpreadsheet size={14} /> Importar fixture desde Excel
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => setShowAddRound(true)}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors text-sm font-semibold"
          >
            <Plus size={15} /> Agregar jornada {nextRound}
          </button>
        )}
      </div>

      {editingMatch && (
        <ResultModal
          match={editingMatch}
          teamColor={teamColor}
          onSave={(hs, as_) => setMatchResult(editingMatch.id, hs, as_)}
          onClose={() => setEditingMatch(null)}
        />
      )}

      {showExcelImport && (
        <FixtureExcelImport
          categoryId={selectedCatId}
          onImport={addFixtureMatches}
          onClose={() => setShowExcelImport(false)}
        />
      )}

      {showAddRound && (
        <AddRoundSheet
          round={nextRound}
          teamColor={teamColor}
          onClose={() => setShowAddRound(false)}
          onSave={handleSaveRound}
        />
      )}
    </div>
  )
}
