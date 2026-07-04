import { Target, HandMetal, Square, Star, Users, BarChart2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { mockStats } from '@/lib/mock'
import { useTeamStore } from '@/store/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import type { PlayerStats } from '@/types'

type StatKey = keyof Pick<PlayerStats, 'goals' | 'assists' | 'yellow_cards' | 'red_cards' | 'mvp_votes' | 'matches_played' | 'attendance_pct'>

interface RankingDef {
  key: StatKey
  label: string
  icon: typeof Target
  color: string
  suffix?: string
}

const RANKINGS: RankingDef[] = [
  { key: 'goals', label: 'Goleadores', icon: Target, color: '#22c55e' },
  { key: 'assists', label: 'Asistidores', icon: HandMetal, color: '#3b82f6' },
  { key: 'mvp_votes', label: 'MVPs', icon: Star, color: '#a855f7' },
  { key: 'matches_played', label: 'Partidos jugados', icon: BarChart2, color: '#6b7280' },
  { key: 'yellow_cards', label: 'Tarjetas amarillas', icon: Square, color: '#f59e0b' },
  { key: 'red_cards', label: 'Tarjetas rojas', icon: Square, color: '#ef4444' },
  { key: 'attendance_pct', label: '% Asistencia', icon: Users, color: '#14b8a6', suffix: '%' },
]

function RankingSection({ rankKey, label, icon: Icon, color, suffix = '' }: Omit<RankingDef, 'key'> & { rankKey: StatKey }) {
  const sorted = [...mockStats].sort((a, b) => b[rankKey] - a[rankKey]).slice(0, 5)
  const max = sorted[0]?.[rankKey] ?? 1

  return (
    <Card padding={false}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-800">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '26' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p className="font-semibold text-white text-sm">{label}</p>
      </div>
      <div className="divide-y divide-gray-800">
        {sorted.map((s, i) => (
          <div key={s.player_id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-gray-600 text-sm w-5 font-mono text-center">{i + 1}</span>
            <Avatar name={s.player_name} src={s.photo_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{s.player_name}</p>
              <div className="h-1 bg-gray-800 rounded-full mt-1.5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s[rankKey] / max) * 100}%`, background: color }}
                />
              </div>
            </div>
            <span className="font-black text-lg ml-2" style={{ color }}>
              {s[rankKey]}{suffix}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function StatsPage() {
  const currentTeamId = useTeamStore(s => s.currentTeamId)
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)

  return (
    <div className="max-w-lg mx-auto pb-6">
      <PageHeader title="Estadísticas" subtitle="Temporada actual" back />
      {isDemo ? (
        <div className="px-4 flex flex-col gap-4">
          {RANKINGS.map(r => {
            const { key, ...rest } = r
            return <RankingSection key={key} {...rest} rankKey={key} />
          })}
        </div>
      ) : (
        <div className="px-4">
          <EmptyState
            icon={<span className="text-5xl">📊</span>}
            title="Sin estadísticas todavía"
            description="Las estadísticas de goles, asistencias, tarjetas y MVPs de este club van a aparecer acá a medida que se carguen los partidos."
          />
        </div>
      )}
    </div>
  )
}
