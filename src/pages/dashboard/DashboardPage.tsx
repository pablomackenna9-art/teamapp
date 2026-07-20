import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Trophy, Calendar, TrendingUp, PieChart, Star, Shirt, HandMetal } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import { calculateStandings } from '@/lib/standings'
import { ourMatches, lastPlayedFor, nextUpcomingFor, ourScore, theirScore, type DisplayMatch } from '@/lib/matches'
import { mockTeam, mockStats } from '@/lib/mock'
import type { Category, ComputedStanding, Title, Post, Photo } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SponsorBanner } from '@/components/SponsorBanner'

function formatMatchDate(date: string) {
  return format(new Date(date), "EEE dd MMM · HH:mm", { locale: es })
}
function formatDateShort(date: string) {
  return format(new Date(date), "dd MMM", { locale: es })
}

// ─── Post type colors & labels ────────────────────────────────────────────────
const POST_META: Record<string, { label: string; color: string; emoji: string }> = {
  citation:     { label: 'CONVOCATORIA', color: '#22c55e', emoji: '📋' },
  notice:       { label: 'AVISO',        color: '#f59e0b', emoji: '📢' },
  announcement: { label: 'ANUNCIO',      color: '#3b82f6', emoji: '🏆' },
}

// ─── News carousel ────────────────────────────────────────────────────────────
// categoryId=null (default) shows only general/home posts; pass a category id
// to show only posts targeted at that specific category.
function NewsCarousel({ categoryId = null }: { teamColor: string; categoryId?: string | null }) {
  const [idx, setIdx] = useState(0)
  const { currentTeamId } = useTeamStore()
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const demoPosts = useDemoStore(s => s.posts)
  const [realPosts, setRealPosts] = useState<Post[]>([])

  useEffect(() => {
    if (isDemo || !currentTeamId) return
    supabase.from('posts').select('*').eq('team_id', currentTeamId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRealPosts(data ?? []))
  }, [isDemo, currentTeamId])

  const posts = (isDemo ? demoPosts : realPosts).filter(p => (p.category_id ?? null) === categoryId)
  if (posts.length === 0) return null
  const post = posts[Math.min(idx, posts.length - 1)]
  const meta = POST_META[post.type] ?? POST_META.notice

  const BG_GRADIENTS = [
    'linear-gradient(160deg, #0f2b1a 0%, #1a3a2a 50%, #0a1f12 100%)',
    'linear-gradient(160deg, #1a1a0a 0%, #2d2a10 50%, #1a1600 100%)',
    'linear-gradient(160deg, #0a1028 0%, #1a2040 50%, #0a0f20 100%)',
  ]

  return (
    <div className="mx-4">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: BG_GRADIENTS[idx % BG_GRADIENTS.length],
          border: `1px solid ${meta.color}30`,
          minHeight: 180,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(ellipse at 30% 40%, ${meta.color}, transparent 70%)` }}
        />

        <div className="relative p-5 pb-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{meta.emoji}</span>
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest"
              style={{ background: meta.color + '30', color: meta.color, border: `1px solid ${meta.color}50` }}
            >
              {meta.label}
            </span>
            <span className="text-gray-500 text-[10px] ml-auto">{formatDateShort(post.created_at)}</span>
          </div>

          <h3 className="text-white font-black text-lg leading-tight mb-2">{post.title}</h3>
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{post.content}</p>
        </div>

        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4">
          <div className="flex gap-1.5">
            {posts.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === idx ? 20 : 6, height: 6,
                  background: i === idx ? meta.color : '#ffffff30',
                }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setIdx(i => (i - 1 + posts.length) % posts.length)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/40"
            >
              <ChevronLeft size={14} color="#fff" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % posts.length)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/40"
            >
              <ChevronRight size={14} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Featured photos carousel ──────────────────────────────────────────────────
function FeaturedPhotosCarousel({ teamColor }: { teamColor: string }) {
  const { currentTeamId } = useTeamStore()
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const demoPhotos = useDemoStore(s => s.photos)
  const [realPhotos, setRealPhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (isDemo || !currentTeamId) return
    supabase.from('photos').select('*').eq('team_id', currentTeamId).eq('featured', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRealPhotos(data ?? []))
  }, [isDemo, currentTeamId])

  const photos = (isDemo ? demoPhotos.filter(p => p.featured) : realPhotos).slice(0, 8)
  if (photos.length === 0) return null

  return (
    <div className="mx-4">
      <div className="flex items-center gap-2 mb-2">
        <Star size={14} style={{ color: teamColor }} fill={teamColor} />
        <span className="text-xs font-black tracking-wider text-white">FOTOS DESTACADAS</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {photos.map(photo => (
          <div key={photo.id} className="shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-gray-800">
            <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, onMore, teamColor, children }: {
  icon: React.ReactNode; title: string; onMore?: () => void; teamColor: string; children: React.ReactNode
}) {
  return (
    <div className="mx-4">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${teamColor}30`, background: '#0d1a0d' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-black tracking-wider text-white">{title}</span>
          </div>
          {onMore && (
            <button onClick={onMore} className="text-gray-500 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  )
}

// ─── Category grid match card (last result OR next match) ────────────────────
function CategoryMatchGridCard({ category, match, kind, onClick }: {
  category: { id: string; name: string }
  match: DisplayMatch | undefined
  kind: 'last' | 'next'
  onClick: () => void
}) {
  const isLast = kind === 'last'
  const os = match ? ourScore(match) : null
  const ts = match ? theirScore(match) : null
  const isWin = isLast && os != null && os > (ts ?? 0)
  const isDraw = isLast && os != null && os === ts
  const isLoss = isLast && os != null && os < (ts ?? 0)

  const resultColor = isWin ? '#22c55e' : isDraw ? '#9ca3af' : isLoss ? '#ef4444' : '#60a5fa'
  const resultLabel = isWin ? 'VICTORIA' : isDraw ? 'EMPATE' : isLoss ? 'DERROTA' : null
  const headerBg = isLast ? resultColor + '35' : '#1e3a5f50'

  return (
    <button
      onClick={onClick}
      disabled={!match}
      className="rounded-2xl overflow-hidden border text-left flex flex-col relative disabled:opacity-50"
      style={{
        borderColor: isLast ? resultColor + '40' : '#1e3a5f40',
        background: isLast ? resultColor + '0d' : '#0a162855',
      }}
    >
      {/* Header bar — category name + last/next label, stacked so long category names never overlap */}
      <div className="py-2 px-2 text-center flex flex-col items-center gap-1" style={{ background: headerBg }}>
        <span
          className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide max-w-full truncate"
          style={{ background: '#00000070', color: '#e5e7eb' }}
        >
          {category.name.toUpperCase()}
        </span>
        <span className="text-[10px] font-black tracking-widest" style={{ color: isLast ? resultColor : '#93c5fd' }}>
          {isLast ? 'ÚLTIMO PARTIDO' : 'PRÓXIMO PARTIDO'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 p-3 flex-1 justify-center min-h-[130px]">
        {match ? (
          <>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ background: '#ffffff10' }}
            >
              ⚽
            </div>
            <p className="text-white font-bold text-xs text-center leading-tight truncate max-w-full">
              {match.rival}
            </p>

            {isLast && os != null ? (
              <>
                <p className="text-2xl font-black text-white">{os} - {ts}</p>
                {resultLabel && (
                  <span
                    className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: resultColor + '25', color: resultColor, border: `1px solid ${resultColor}50` }}
                  >
                    {resultLabel}
                  </span>
                )}
              </>
            ) : (
              <div className="w-5 h-0.5 bg-gray-700 rounded-full my-1" />
            )}

            <p className="text-[9px] text-gray-500 text-center">{formatDateShort(match.date)}</p>
          </>
        ) : (
          <p className="text-gray-600 text-xs">Sin partidos</p>
        )}
      </div>
    </button>
  )
}

// ─── Compact standings mini table (for home grid) ─────────────────────────────
function CompactStandings({ categoryName, teamName, teamColor, rows, onSeeAll }: {
  categoryName: string; teamName: string; teamColor: string; rows: ComputedStanding[]; onSeeAll: () => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-800 flex flex-col items-center justify-center py-6" style={{ background: '#0d1117' }}>
        <span className="text-xs font-black mb-1" style={{ color: teamColor }}>{categoryName.toUpperCase()}</span>
        <p className="text-gray-600 text-[11px]">Sin resultados aún</p>
      </div>
    )
  }

  return (
    <button
      onClick={onSeeAll}
      className="rounded-2xl overflow-hidden border border-gray-800 text-left flex flex-col"
      style={{ background: '#0d1117' }}
    >
      <div className="px-3 py-2 border-b border-gray-800/60">
        <span className="text-xs font-black" style={{ color: teamColor }}>{categoryName.toUpperCase()}</span>
      </div>
      <div className="flex items-center px-3 py-1 border-b border-gray-800/40">
        <span className="w-5 text-gray-600 text-[9px] font-bold">#</span>
        <span className="flex-1 text-gray-600 text-[9px] font-bold">EQUIPO</span>
        <span className="w-8 text-center text-gray-600 text-[9px] font-bold">PTS</span>
        <span className="w-6 text-center text-gray-600 text-[9px] font-bold">PJ</span>
      </div>
      <div className="max-h-[150px] overflow-hidden">
        {rows.slice(0, 9).map((t, i) => {
          const isUs = t.name === teamName || t.name === 'Maestros'
          return (
            <div
              key={t.name}
              className="flex items-center px-3 py-1.5 border-b border-gray-800/20 last:border-0"
              style={isUs ? { background: teamColor + '20' } : undefined}
            >
              <span className="w-5 text-[10px] font-bold" style={{ color: i === 0 ? '#fbbf24' : '#6b7280' }}>
                {i === 0 ? '🥇' : i + 1}
              </span>
              <span
                className="flex-1 text-[11px] font-semibold truncate"
                style={isUs ? { color: teamColor } : { color: '#d1d5db' }}
              >
                {t.name}
              </span>
              <span className="w-8 text-center text-[11px] font-black" style={{ color: isUs ? teamColor : '#e5e7eb' }}>
                {t.points}
              </span>
              <span className="w-6 text-center text-[10px] text-gray-500">{t.played}</span>
            </div>
          )
        })}
      </div>
    </button>
  )
}


// ─── Titles / trophies section ─────────────────────────────────────────────────
function TitlesSection({ teamColor, categories, titles }: { teamColor: string; categories: Category[]; titles: Title[] }) {
  const [expanded, setExpanded] = useState(false)

  const total = titles.length
  const byCategory = categories
    .map(cat => ({ cat, count: titles.filter(t => t.category_id === cat.id).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  const sortedTitles = [...titles].sort((a, b) => b.year - a.year)
  const visibleTitles = expanded ? sortedTitles : sortedTitles.slice(0, 5)

  if (total === 0) return null

  return (
    <div className="mx-4">
      <div
        className="rounded-2xl overflow-hidden border p-4"
        style={{ borderColor: teamColor + '30', background: '#0d1117' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} style={{ color: teamColor }} />
          <span className="text-xs font-black tracking-wider" style={{ color: teamColor }}>TÍTULOS</span>
        </div>
        <p className="text-3xl font-black text-white mb-2">
          {total} <span className="text-sm font-bold text-gray-400">TÍTULOS TOTALES</span>
        </p>

        {/* Trophy row */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {Array.from({ length: total }).map((_, i) => (
            <Trophy key={i} size={18} style={{ color: '#fbbf24' }} fill="#fbbf24" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Ranking by category */}
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Ranking por equipos (estrellas)</p>
            <div className="flex flex-col gap-2">
              {byCategory.map(({ cat, count }) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="w-5 text-sm font-black" style={{ color: teamColor }}>{count}</span>
                  <span className="text-[11px] font-bold text-white uppercase w-20 truncate">{cat.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <Star key={i} size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail list */}
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Detalle de títulos</p>
            <div className="flex flex-col gap-1.5">
              {visibleTitles.map(t => {
                const cat = categories.find(c => c.id === t.category_id)
                return (
                  <div key={t.id} className="flex items-center gap-2 text-[11px]">
                    <Trophy size={12} style={{ color: '#fbbf24' }} />
                    <span className="text-gray-300 font-semibold uppercase w-16 truncate">{cat?.name}</span>
                    <span className="text-gray-500 flex-1 truncate">{t.tournament} {t.year}</span>
                    <Star size={10} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                  </div>
                )
              })}
            </div>
            {sortedTitles.length > 5 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full mt-2 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
              >
                {expanded ? 'Ver menos ▲' : `Ver ${sortedTitles.length - 5} más ▼`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ slug, teamColor, teamName, isAdmin, isDemo }: {
  slug: string; teamColor: string; teamName: string; isAdmin: boolean; isDemo: boolean
}) {
  const navigate = useNavigate()
  const { categories, fixtureMatches, pointsPerWin, titles } = useTeamStore()

  const matches = ourMatches(fixtureMatches, teamName)
  // Real per-player goal/assist stats aren't tracked yet for real clubs — only
  // show the demo's sample ranking so a real club's home doesn't show fake data.
  const topScorers = isDemo ? [...mockStats].sort((a, b) => b.goals - a.goals).slice(0, 5) : []

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Sponsor — top of the page */}
      <SponsorBanner sectionKey="home-top" />

      {/* News carousel */}
      <NewsCarousel teamColor={teamColor} />

      {/* Featured photos */}
      <FeaturedPhotosCarousel teamColor={teamColor} />

      {categories.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed border-gray-800 py-10 text-center">
          <p className="text-3xl mb-2">🏟️</p>
          <p className="text-white font-semibold text-sm">Todavía no hay categorías</p>
          <p className="text-gray-500 text-xs mt-1">
            {isAdmin ? 'Agregá la primera desde Configuración para empezar a cargar resultados.' : 'El club todavía no cargó información.'}
          </p>
        </div>
      ) : (
        <>
          {/* Últimos resultados — grid por categoría */}
          <Section
            icon={<PieChart size={15} style={{ color: teamColor }} />}
            title={`ÚLTIMOS RESULTADOS ${teamName.toUpperCase()}`}
            onMore={() => navigate(`/team/${slug}/fixture`)}
            teamColor={teamColor}
          >
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const m = lastPlayedFor(matches, cat.id)
                return (
                  <CategoryMatchGridCard
                    key={cat.id}
                    category={cat}
                    match={m}
                    kind="last"
                    onClick={() => m && navigate(`/team/${slug}/matches/${m.id}`)}
                  />
                )
              })}
            </div>
          </Section>

          {/* Próximos partidos — grid por categoría */}
          <Section
            icon={<Calendar size={14} style={{ color: teamColor }} />}
            title="PRÓXIMOS PARTIDOS"
            onMore={() => navigate(`/team/${slug}/fixture`)}
            teamColor={teamColor}
          >
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const m = nextUpcomingFor(matches, cat.id)
                return (
                  <CategoryMatchGridCard
                    key={cat.id}
                    category={cat}
                    match={m}
                    kind="next"
                    onClick={() => m && navigate(`/team/${slug}/matches/${m.id}`)}
                  />
                )
              })}
            </div>
          </Section>

          {/* Tablas de posiciones — grid por categoría */}
          <Section
            icon={<Trophy size={14} style={{ color: teamColor }} />}
            title="TABLAS DE POSICIONES"
            teamColor={teamColor}
          >
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <CompactStandings
                  key={cat.id}
                  categoryName={cat.name}
                  teamName={teamName}
                  teamColor={teamColor}
                  rows={calculateStandings(fixtureMatches, cat.id, pointsPerWin[cat.id] ?? 3)}
                  onSeeAll={() => navigate(`/team/${slug}/standings`)}
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Goleadores */}
      {topScorers.length > 0 && (
        <Section
          icon={<TrendingUp size={14} style={{ color: teamColor }} />}
          title="GOLEADORES DEL CLUB"
          onMore={() => navigate(`/team/${slug}/stats`)}
          teamColor={teamColor}
        >
          <div className="flex flex-col gap-2">
            {topScorers.map((s, i) => (
              <div key={s.player_id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-gray-800"
                style={{ background: '#0d1117' }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{ background: i === 0 ? teamColor : '#1f2937', color: i === 0 ? '#030712' : '#6b7280' }}
                >
                  {i + 1}
                </span>
                <p className="flex-1 text-white text-sm font-semibold truncate">{s.player_name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                  <span><span className="font-black text-sm" style={{ color: teamColor }}>{s.goals}</span> goles</span>
                  <span>{s.assists} asis.</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Títulos */}
      <TitlesSection teamColor={teamColor} categories={categories} titles={titles} />

      {/* Sponsor — bottom of the page */}
      <SponsorBanner sectionKey="home-bottom" />

      {/* Admin actions */}
      {isAdmin && (
        <div className="px-4 grid grid-cols-2 gap-3">
          <button onClick={() => navigate(`/team/${slug}/fixture`)}
            className="py-3 rounded-2xl text-xs font-semibold border border-gray-800 text-gray-300 hover:bg-gray-900 active:scale-95 transition-all">
            + Nuevo partido
          </button>
          <button onClick={() => navigate(`/team/${slug}/news`)}
            className="py-3 rounded-2xl text-xs font-semibold border border-gray-800 text-gray-300 hover:bg-gray-900 active:scale-95 transition-all">
            + Publicar aviso
          </button>
        </div>
      )}
    </div>
  )
}

// ─── CATEGORY VIEW ────────────────────────────────────────────────────────────
function CategoryView({ slug, teamColor, teamName, isAdmin, categoryId, isDemo }: {
  slug: string; teamColor: string; teamName: string; isAdmin: boolean; categoryId: string; isDemo: boolean
}) {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const { fixtureMatches, categories, pointsPerWin } = useTeamStore()
  const demoPlayers = useDemoStore(s => s.players)
  const activeCategory = categories.find(c => c.id === categoryId)

  const matches = ourMatches(fixtureMatches, teamName)
  const categoryMatches = matches.filter(m => m.category_id === categoryId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const lastMatch = lastPlayedFor(matches, categoryId)
  const nextMatch = nextUpcomingFor(matches, categoryId)
  const standingsRows = calculateStandings(fixtureMatches, categoryId, pointsPerWin[categoryId] ?? 3)

  // Real per-player goal/assist/MVP stats aren't tracked yet for real clubs.
  const categoryPlayerIds = new Set(demoPlayers.filter(p => p.category_id === categoryId).map(p => p.id))
  const categoryScorers = isDemo ? [...mockStats].filter(s => categoryPlayerIds.has(s.player_id)).sort((a, b) => b.goals - a.goals).slice(0, 5) : []
  const categoryAssisters = isDemo ? [...mockStats].filter(s => categoryPlayerIds.has(s.player_id)).sort((a, b) => b.assists - a.assists).slice(0, 5) : []
  const categoryMvps = isDemo ? [...mockStats].filter(s => categoryPlayerIds.has(s.player_id) && s.mvp_votes > 0).sort((a, b) => b.mvp_votes - a.mvp_votes).slice(0, 5) : []

  function MatchCard({ match, type }: { match: DisplayMatch | undefined; type: 'last' | 'next' }) {
    const isLast = type === 'last'
    const os = match ? ourScore(match) : null
    const ts = match ? theirScore(match) : null
    const isWin = os != null && os > (ts ?? 0)
    const isDraw = os != null && os === ts
    const isLoss = os != null && os < (ts ?? 0)
    const resultColor = isWin ? '#22c55e' : isDraw ? '#f59e0b' : '#ef4444'
    const resultLabel = isWin ? 'VICTORIA' : isDraw ? 'EMPATE' : isLoss ? 'DERROTA' : null

    return (
      <div
        className="flex-1 rounded-2xl p-4 flex flex-col gap-3 min-h-[190px]"
        style={{
          background: isLast ? 'linear-gradient(160deg,#3b0a0a,#1a0505)' : 'linear-gradient(160deg,#0a1628,#050d1a)',
          border: `1px solid ${isLast ? '#7f1d1d40' : '#1e3a5f40'}`,
        }}
      >
        <p className="text-[10px] font-black tracking-widest"
          style={{ color: isLast ? '#ef4444' : '#60a5fa' }}>
          {isLast ? 'ÚLTIMO' : 'PRÓXIMO'}
        </p>
        <div className="flex flex-col items-center gap-2 flex-1 justify-center">
          <span className="text-3xl">⚽</span>
          <p className="text-white font-bold text-sm text-center leading-tight">
            {match ? (isLast ? match.rival : `vs ${match.rival}`) : '—'}
          </p>
          {isLast && os != null ? (
            <>
              <p className="text-3xl font-black text-white">{os} - {ts}</p>
              {resultLabel && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: resultColor + '30', color: resultColor, border: `1px solid ${resultColor}60` }}>
                  {resultLabel}
                </span>
              )}
            </>
          ) : match ? (
            <p className="text-[10px] text-gray-500 text-center">{formatMatchDate(match.date)}</p>
          ) : null}
        </div>
        <button
          onClick={() => match && navigate(`/team/${slug}/matches/${match.id}`)}
          disabled={!match}
          className="w-full py-2 rounded-xl text-xs font-semibold"
          style={isLast
            ? { background: '#ffffff10', color: '#d1d5db' }
            : { background: 'var(--team-color-dim)', color: 'var(--team-color)' }
          }
        >
          {isLast ? 'Ver detalle' : 'Ver detalle y confirmar'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Sponsor — top of the category */}
      <SponsorBanner sectionKey={`category-top-${categoryId}`} />

      {/* News targeted at this category only */}
      <NewsCarousel teamColor={teamColor} categoryId={categoryId} />

      {/* Ver plantel — scoped to this category */}
      <div className="px-4">
        <button
          onClick={() => navigate(`/team/${slug}/squad`)}
          className="w-full py-3.5 rounded-2xl text-sm font-black tracking-wide active:opacity-80 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`, color: '#030712' }}
        >
          <Shirt size={16} /> Ver plantel {activeCategory?.name} {currentYear}
        </button>
      </div>

      {/* Category matches */}
      <div className="mx-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black tracking-wider text-white">RESULTADOS</span>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: teamColor + '20', color: teamColor }}
          >
            {activeCategory?.name.toUpperCase()}
          </span>
          <button onClick={() => navigate(`/team/${slug}/fixture`)}
            className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: teamColor }}>
            Ver todo <ChevronRight size={13} />
          </button>
        </div>
        <div className="flex gap-3">
          <MatchCard match={lastMatch} type="last" />
          <MatchCard match={nextMatch} type="next" />
        </div>
      </div>

      {/* Category standings — only this category */}
      {standingsRows.length > 0 && (
        <div className="mx-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={14} style={{ color: teamColor }} />
              <span className="text-xs font-black tracking-wider text-white">TABLA DE POSICIONES</span>
              <span className="text-[10px] font-black" style={{ color: teamColor }}>
                {activeCategory?.name.toUpperCase()}
              </span>
            </div>
          </div>
          <FullMiniStandings
            rows={standingsRows}
            teamName={teamName}
            teamColor={teamColor}
            onSeeAll={() => navigate(`/team/${slug}/standings`)}
          />
        </div>
      )}

      {/* Full results — Fecha a fecha, like a league scoreboard */}
      {categoryMatches.length > 0 && (
        <div className="mx-4">
          <div className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: '#0d1117' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-xs font-black tracking-wider text-white">RESULTADOS {currentYear}</span>
              <span className="text-[10px] text-gray-500">TEMPORADA EN CURSO</span>
            </div>
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-800/60">
              <span className="text-xs font-black" style={{ color: teamColor }}>{activeCategory?.name.toUpperCase()}</span>
              <span className="text-[10px] text-gray-500">{categoryMatches.length} partidos</span>
            </div>
            {categoryMatches.map(m => (
              <div key={m.id} className="flex items-center px-4 py-2.5 border-b border-gray-800/20 last:border-0">
                <span className="w-16 text-[11px] text-gray-500 shrink-0">{formatDateShort(m.date)}</span>
                <div className="flex-1 min-w-0 text-[12px]">
                  <span style={{ color: teamColor, fontWeight: 700 }}>{teamName}</span>
                  {m.played ? (
                    <span className="text-white font-black mx-1.5">{ourScore(m)} – {theirScore(m)}</span>
                  ) : (
                    <span className="text-gray-600 mx-1.5">vs</span>
                  )}
                  <span style={{ color: '#e5e7eb' }}>{m.rival}</span>
                </div>
                <button
                  onClick={() => navigate(`/team/${slug}/matches/${m.id}`)}
                  className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Detalle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goleadores + asistidores + MVPs of this category */}
      {(categoryScorers.length > 0 || categoryAssisters.length > 0 || categoryMvps.length > 0) && (
        <div className="mx-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: '#0d1117' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <TrendingUp size={13} style={{ color: teamColor }} />
              <span className="text-xs font-black tracking-wider text-white">GOLEADORES</span>
            </div>
            {categoryScorers.map((s, i) => (
              <div key={s.player_id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/30 last:border-0">
                <span className="text-gray-600 text-[10px] font-bold w-4">{i + 1}</span>
                <span className="flex-1 text-white text-xs font-semibold truncate">{s.player_name}</span>
                <span className="font-black text-sm" style={{ color: teamColor }}>{s.goals}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: '#0d1117' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <HandMetal size={13} style={{ color: '#3b82f6' }} />
              <span className="text-xs font-black tracking-wider text-white">ASISTIDORES</span>
            </div>
            {categoryAssisters.map((s, i) => (
              <div key={s.player_id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/30 last:border-0">
                <span className="text-gray-600 text-[10px] font-bold w-4">{i + 1}</span>
                <span className="flex-1 text-white text-xs font-semibold truncate">{s.player_name}</span>
                <span className="font-black text-sm text-blue-400">{s.assists}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-800 sm:col-span-2" style={{ background: '#0d1117' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <Star size={13} style={{ color: '#fbbf24' }} />
              <span className="text-xs font-black tracking-wider text-white">MVPs</span>
            </div>
            {categoryMvps.map((s, i) => (
              <div key={s.player_id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/30 last:border-0">
                <span className="text-gray-600 text-[10px] font-bold w-4">{i + 1}</span>
                <span className="flex-1 text-white text-xs font-semibold truncate">{s.player_name}</span>
                <div className="flex items-center gap-1">
                  <Star size={12} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                  <span className="font-black text-sm text-amber-400">{s.mvp_votes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sponsor — bottom of the category */}
      <SponsorBanner sectionKey={`category-bottom-${categoryId}`} />

      {isAdmin && (
        <div className="px-4 grid grid-cols-2 gap-3">
          <button onClick={() => navigate(`/team/${slug}/fixture`)}
            className="py-3 rounded-2xl text-xs font-semibold border border-gray-800 text-gray-300 hover:bg-gray-900">
            + Nuevo partido
          </button>
          <button onClick={() => navigate(`/team/${slug}/news`)}
            className="py-3 rounded-2xl text-xs font-semibold border border-gray-800 text-gray-300 hover:bg-gray-900">
            + Publicar aviso
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Full-width standings table (used in category view) ───────────────────────
function FullMiniStandings({ rows, teamName, teamColor, onSeeAll }: {
  rows: ComputedStanding[]; teamName: string; teamColor: string; onSeeAll: () => void
}) {
  if (!rows.length) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800" style={{ background: '#0d1117' }}>
      <div className="flex items-center px-3 py-2 border-b border-gray-800/60">
        <span className="w-6 text-gray-600 text-[10px] font-bold text-center">#</span>
        <span className="flex-1 text-gray-600 text-[10px] font-bold ml-2">EQUIPO</span>
        {['PTS','PJ','PG','PE','PP','GF','GC'].map(h => (
          <span key={h} className="w-7 text-center text-gray-600 text-[10px] font-bold">{h}</span>
        ))}
      </div>
      {rows.slice(0, 5).map((t, i) => {
        const isUs = t.name === teamName
        return (
          <div
            key={t.name}
            className="flex items-center px-3 py-2.5 border-b border-gray-800/30 last:border-0"
            style={isUs ? { background: teamColor + '18' } : undefined}
          >
            <div className="w-6 text-center">
              {i === 0 ? <span className="text-sm">🥇</span> : <span className="text-xs font-bold text-gray-500">{i + 1}</span>}
            </div>
            <div className="flex-1 flex items-center gap-1.5 ml-2 min-w-0">
              {isUs && <span className="text-[10px]">⚽</span>}
              <span className="text-xs font-semibold truncate" style={isUs ? { color: teamColor } : { color: '#f9fafb' }}>
                {t.name}
              </span>
            </div>
            {[t.points,t.played,t.won,t.drawn,t.lost,t.gf,t.gc].map((v,j)=>(
              <span key={j} className="w-7 text-center text-xs"
                style={j===0 ? {color:teamColor,fontWeight:900,fontSize:'13px'} : {color:'#9ca3af'}}>{v}</span>
            ))}
          </div>
        )
      })}
      <button onClick={onSeeAll} className="w-full py-2.5 text-xs font-semibold border-t border-gray-800"
        style={{ color: teamColor }}>
        Ver tabla completa →
      </button>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { slug } = useParams()
  const { activeCategoryId, viewMode, teamColor, memberRole, teamName, currentTeamId } = useTeamStore()
  // Creating matches / posting news is reserved for team coordinadores
  const isAdmin = memberRole === 'admin' || memberRole === 'coordinador'
  const resolvedTeamName = teamName || mockTeam.name
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)

  if (viewMode === 'category' && activeCategoryId) {
    return (
      <div className="max-w-lg mx-auto">
        <CategoryView
          slug={slug!}
          teamColor={teamColor}
          teamName={resolvedTeamName}
          isAdmin={isAdmin}
          categoryId={activeCategoryId}
          isDemo={isDemo}
        />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <HomeView slug={slug!} teamColor={teamColor} teamName={resolvedTeamName} isAdmin={isAdmin} isDemo={isDemo} />
    </div>
  )
}
