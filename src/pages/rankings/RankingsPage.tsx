import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Target, HandMetal, Star, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { EmptyState } from '@/components/EmptyState'
import type { League, Team } from '@/types'

interface PlayerTally {
  player_id: string
  player_name: string
  team_name: string
  count: number
}

interface TeamTally {
  team_id: string
  team_name: string
  points: number
  played: number
  won: number
  drawn: number
  lost: number
}

function RankingList({ icon: Icon, color, title, rows, unit }: {
  icon: typeof Target; color: string; title: string; rows: PlayerTally[]; unit: string
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 mb-4" style={{ background: '#0d1117' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-black tracking-wider text-white">{title}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">Sin datos todavía</p>
      ) : rows.map((r, i) => (
        <div key={r.player_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/40 last:border-0">
          <span className="w-5 text-gray-600 text-xs font-mono">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{r.player_name}</p>
            <p className="text-gray-500 text-[11px] truncate">{r.team_name}</p>
          </div>
          <span className="font-black text-lg shrink-0" style={{ color }}>{r.count}</span>
          <span className="text-gray-600 text-[10px] shrink-0 -ml-1">{unit}</span>
        </div>
      ))}
    </div>
  )
}

export function RankingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [leagues, setLeagues] = useState<League[]>([])
  const [leagueId, setLeagueId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scorers, setScorers] = useState<PlayerTally[]>([])
  const [assisters, setAssisters] = useState<PlayerTally[]>([])
  const [mvps, setMvps] = useState<PlayerTally[]>([])
  const [teamRanking, setTeamRanking] = useState<TeamTally[]>([])

  useEffect(() => {
    async function init() {
      if (!user) { setChecked(true); return }
      const { data: adminRow } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
      setIsPlatformAdmin(!!adminRow)
      const { data: leagueRows } = await supabase.from('leagues').select('*').order('name')
      setLeagues(leagueRows ?? [])
      if (leagueRows && leagueRows.length > 0) setLeagueId(leagueRows[0].id)
      setChecked(true)
    }
    init()
  }, [user])

  useEffect(() => {
    if (!leagueId) return
    loadLeagueData(leagueId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId])

  async function loadLeagueData(id: string) {
    setLoading(true)
    const { data: teams } = await supabase.from('teams').select('*').eq('league_id', id)
    const teamList: Team[] = teams ?? []
    const teamIds = teamList.map(t => t.id)
    const teamNameById = new Map(teamList.map(t => [t.id, t.name]))

    if (teamIds.length === 0) {
      setScorers([]); setAssisters([]); setMvps([]); setTeamRanking([])
      setLoading(false)
      return
    }

    const [{ data: players }, { data: events }, { data: votes }, { data: matches }] = await Promise.all([
      supabase.from('players').select('id, name, team_id').in('team_id', teamIds),
      supabase.from('fixture_match_events').select('player_id, type, team_id').in('team_id', teamIds),
      supabase.from('fixture_match_mvp_votes').select('target_player_id, team_id').in('team_id', teamIds),
      supabase.from('fixture_matches').select('team_id, home_team, away_team, home_score, away_score, played').in('team_id', teamIds),
    ])

    const playerById = new Map((players ?? []).map(p => [p.id, p]))

    function tally(rows: { player_id: string }[] | null): PlayerTally[] {
      const counts = new Map<string, number>()
      for (const row of rows ?? []) {
        counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1)
      }
      return Array.from(counts.entries())
        .map(([playerId, count]) => {
          const p = playerById.get(playerId)
          return {
            player_id: playerId,
            player_name: p?.name ?? 'Jugador',
            team_name: p ? (teamNameById.get(p.team_id) ?? '') : '',
            count,
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    setScorers(tally((events ?? []).filter(e => e.type === 'goal')))
    setAssisters(tally((events ?? []).filter(e => e.type === 'assist')))
    setMvps(tally((votes ?? []).map(v => ({ player_id: v.target_player_id }))))

    // Best teams: aggregate each team's own points across all its matches (any category)
    const teamStats = new Map<string, TeamTally>()
    for (const t of teamList) {
      teamStats.set(t.id, { team_id: t.id, team_name: t.name, points: 0, played: 0, won: 0, drawn: 0, lost: 0 })
    }
    for (const m of matches ?? []) {
      if (!m.played || m.home_score === null || m.away_score === null) continue
      const stat = teamStats.get(m.team_id)
      const teamName = teamNameById.get(m.team_id)
      if (!stat || !teamName) continue
      const weWereHome = m.home_team === teamName || m.home_team === 'Maestros'
      const us = weWereHome ? m.home_score : m.away_score
      const them = weWereHome ? m.away_score : m.home_score
      stat.played++
      if (us > them) { stat.won++; stat.points += 3 }
      else if (us < them) { stat.lost++ }
      else { stat.drawn++; stat.points += 1 }
    }
    setTeamRanking(Array.from(teamStats.values()).sort((a, b) => b.points - a.points))

    setLoading(false)
  }

  if (!checked) {
    return <div className="min-h-dvh flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-800 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} /></div>
  }

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10">
        <EmptyState icon={<span className="text-5xl">🔒</span>} title="Sin acceso" description="Solo el super admin de la plataforma puede ver los rankings entre clubes." />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-10">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/teams')} className="text-gray-400 hover:text-white shrink-0">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Rankings de la liga</h1>
          <p className="text-gray-500 text-sm">Goleadores, asistidores, MVPs y mejores equipos entre clubes</p>
        </div>
      </div>

      {leagues.length === 0 ? (
        <EmptyState icon={<Trophy size={40} />} title="No hay ligas creadas" description="Creá una liga primero desde 'Todos los equipos'." />
      ) : (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
            {leagues.map(l => (
              <button
                key={l.id}
                onClick={() => setLeagueId(l.id)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors"
                style={leagueId === l.id ? { background: '#22c55e', color: '#030712' } : { background: '#1f2937', color: '#9ca3af' }}
              >
                {l.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} />
            </div>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden border border-gray-800 mb-4" style={{ background: '#0d1117' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <Trophy size={14} className="text-amber-400" />
                  <span className="text-xs font-black tracking-wider text-white">MEJORES EQUIPOS</span>
                </div>
                {teamRanking.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-6">Sin partidos jugados todavía</p>
                ) : (
                  <>
                    <div className="flex items-center px-4 py-1.5 border-b border-gray-800/40">
                      <span className="w-5 text-gray-600 text-[9px] font-bold">#</span>
                      <span className="flex-1 text-gray-600 text-[9px] font-bold">CLUB</span>
                      <span className="w-8 text-center text-gray-600 text-[9px] font-bold">PTS</span>
                      <span className="w-6 text-center text-gray-600 text-[9px] font-bold">PJ</span>
                    </div>
                    {teamRanking.map((t, i) => (
                      <div key={t.team_id} className="flex items-center px-4 py-2.5 border-b border-gray-800/30 last:border-0">
                        <span className="w-5 text-xs font-bold" style={{ color: i === 0 ? '#fbbf24' : '#6b7280' }}>{i === 0 ? '🥇' : i + 1}</span>
                        <span className="flex-1 text-sm font-semibold text-white truncate">{t.team_name}</span>
                        <span className="w-8 text-center font-black text-sm" style={{ color: '#22c55e' }}>{t.points}</span>
                        <span className="w-6 text-center text-xs text-gray-500">{t.played}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <RankingList icon={Target} color="#22c55e" title="GOLEADORES" rows={scorers} unit="goles" />
              <RankingList icon={HandMetal} color="#3b82f6" title="ASISTIDORES" rows={assisters} unit="asis." />
              <RankingList icon={Star} color="#fbbf24" title="MVPs" rows={mvps} unit="mvp" />
            </>
          )}
        </>
      )}
    </div>
  )
}
