import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Calendar, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { SponsorBanner } from '@/components/SponsorBanner'
import { mockMatches } from '@/lib/mock'
import { formatDateTime, getResultBadge, scoreLabel } from '@/lib/utils'
import { useTeamStore } from '@/store/authStore'
import type { Match } from '@/types'

type Tab = 'upcoming' | 'played' | 'all'

const RESULT_STYLES = {
  W: { label: 'G', class: 'bg-green-900/60 text-green-400' },
  D: { label: 'E', class: 'bg-yellow-900/60 text-yellow-400' },
  L: { label: 'P', class: 'bg-red-900/60 text-red-400' },
}

function MatchCard({ match, onClick }: { match: Match, onClick: () => void }) {
  const result = getResultBadge(match.home_score, match.away_score)
  const { teamColor } = useTeamStore()

  return (
    <Card onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={match.type === 'official' ? 'team' : 'default'}>
            {match.type === 'official' ? 'Oficial' : 'Amistoso'}
          </Badge>
          {match.status === 'suspended' && <Badge variant="warning">Suspendido</Badge>}
        </div>
        {result && (
          <span className={`w-7 h-7 rounded-full text-sm font-black flex items-center justify-center ${RESULT_STYLES[result].class}`}>
            {RESULT_STYLES[result].label}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <p className="text-white font-bold text-base">vs {match.rival}</p>
        {match.status === 'played' ? (
          <p className="text-2xl font-black" style={{ color: teamColor }}>
            {scoreLabel(match.home_score, match.away_score)}
          </p>
        ) : (
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Próximo</span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-gray-500 text-xs">
        <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateTime(match.date)}</span>
        {match.location && <span className="flex items-center gap-1"><MapPin size={11} /> {match.location}</span>}
      </div>
    </Card>
  )
}

export function MatchesPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { memberRole } = useTeamStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'captain' || memberRole === 'coordinador'
  const [tab, setTab] = useState<Tab>('upcoming')

  const filtered = tab === 'all'
    ? mockMatches
    : mockMatches.filter(m => m.status === tab)

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Partidos"
        back
        action={isAdmin && (
          <Button size="sm" onClick={() => navigate(`/team/${slug}/matches/new`)}>
            <Plus size={14} /> Nuevo
          </Button>
        )}
      />

      <div className="mb-4">
        <SponsorBanner sectionKey="matches" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-4 bg-gray-900 rounded-xl p-1">
        {([['upcoming', 'Próximos'], ['played', 'Jugados'], ['all', 'Todos']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            style={tab === key
              ? { background: 'var(--team-color)', color: '#030712' }
              : { color: '#9ca3af' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} />}
            title="Sin partidos"
            description={tab === 'upcoming' ? 'No hay partidos próximos cargados' : 'No hay partidos en esta categoría'}
          />
        ) : (
          filtered.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => navigate(`/team/${slug}/matches/${match.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
