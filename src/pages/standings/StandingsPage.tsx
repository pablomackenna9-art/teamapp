import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SponsorBanner } from '@/components/SponsorBanner'
import { mockCategories } from '@/lib/mock'
import { calculateStandings } from '@/lib/standings'
import { useTeamStore } from '@/store/authStore'

export function StandingsPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { teamColor, teamName, activeCategoryId, categories, fixtureMatches, pointsPerWin, setPointsPerWin, memberRole } = useTeamStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'captain' || memberRole === 'coordinador'
  const resolvedTeamName = teamName || 'Maestros'

  const activeCategories = categories.length > 0 ? categories : mockCategories
  const [selectedCatId, setSelectedCatId] = useState<string>(
    activeCategoryId ?? (activeCategories[0]?.id ?? '')
  )

  const pts = pointsPerWin[selectedCatId] ?? 3
  const rows = calculateStandings(fixtureMatches, selectedCatId, pts)

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader
        title="Tabla de posiciones"
        back
        action={isAdmin && (
          <button
            onClick={() => navigate(`/team/${slug}/fixture`)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ background: teamColor + '20', color: teamColor }}
          >
            Fixture
          </button>
        )}
      />

      <div className="mb-3">
        <SponsorBanner sectionKey="standings" categoryId={selectedCatId} />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {activeCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
            style={selectedCatId === cat.id
              ? { background: teamColor, color: '#030712' }
              : { background: '#1f2937', color: '#9ca3af' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Points per win config (admin only) */}
      {isAdmin && (
        <div className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/50">
          <span className="text-xs text-gray-400 flex-1">Puntos por victoria:</span>
          {([2, 3] as const).map(n => (
            <button
              key={n}
              onClick={() => setPointsPerWin(selectedCatId, n)}
              className="w-10 h-8 rounded-lg text-sm font-black transition-colors"
              style={pts === n
                ? { background: teamColor, color: '#030712' }
                : { background: '#374151', color: '#9ca3af' }
              }
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mx-4">
        <div className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: '#0d1117' }}>
          {/* Header */}
          <div className="flex items-center px-3 py-2.5 border-b border-gray-800">
            <span className="w-7 text-gray-600 text-[10px] font-bold text-center">#</span>
            <span className="flex-1 text-gray-600 text-[10px] font-bold ml-2">EQUIPO</span>
            {['PTS', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'].map(h => (
              <span key={h} className="w-7 text-center text-gray-600 text-[10px] font-bold">{h}</span>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              <p className="text-2xl mb-2">📋</p>
              <p>Sin resultados cargados aún</p>
              {isAdmin && (
                <button
                  onClick={() => {
                    navigate(`/team/${slug}/fixture`)
                  }}
                  className="mt-3 text-xs font-bold px-4 py-2 rounded-xl"
                  style={{ background: teamColor + '20', color: teamColor }}
                >
                  Cargar fixture →
                </button>
              )}
            </div>
          ) : rows.map((t, i) => {
            const isUs = t.name === resolvedTeamName || t.name === 'Maestros'
            const dg = t.gf - t.gc
            return (
              <div
                key={t.name}
                className="flex items-center px-3 py-3 border-b border-gray-800/40 last:border-0"
                style={isUs ? { background: teamColor + '18' } : undefined}
              >
                <div className="w-7 text-center">
                  {i === 0
                    ? <span className="text-base">🥇</span>
                    : <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                  }
                </div>
                <div className="flex-1 flex items-center gap-1.5 ml-2 min-w-0">
                  {isUs && <span className="text-xs">⚽</span>}
                  <span
                    className="text-sm font-semibold truncate"
                    style={isUs ? { color: teamColor } : { color: '#f9fafb' }}
                  >
                    {t.name} {isUs ? '(nosotros)' : ''}
                  </span>
                </div>
                {[
                  { val: t.points, bold: true },
                  { val: t.played },
                  { val: t.won },
                  { val: t.drawn },
                  { val: t.lost },
                  { val: t.gf },
                  { val: t.gc },
                  { val: dg > 0 ? `+${dg}` : dg },
                ].map(({ val, bold }, j) => (
                  <span
                    key={j}
                    className="w-7 text-center text-xs"
                    style={bold
                      ? { color: teamColor, fontWeight: 900, fontSize: '13px' }
                      : { color: '#9ca3af' }
                    }
                  >
                    {val}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        {rows.length > 0 && (
          <p className="text-gray-600 text-[10px] text-center mt-2">
            {pts} pts por victoria · 1 pt por empate
          </p>
        )}
      </div>
    </div>
  )
}
