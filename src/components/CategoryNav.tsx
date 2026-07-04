import { useNavigate, useParams } from 'react-router-dom'
import { Zap, ShieldCheck, CreditCard, BarChart3 } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'

// Cycle through a small set of icons per tab position — purely decorative,
// keeps every category tab visually distinct regardless of its name.
const TAB_ICONS = [Zap, ShieldCheck, CreditCard, BarChart3]

export function CategoryNav() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { categories, activeCategoryId, viewMode, setActiveCategory, setViewMode, teamLogoUrl, teamName, teamColor, currentTeamId } = useTeamStore()

  // Nothing to show at all yet (no team loaded) — but once a team is loaded,
  // always show at least the center logo/home button even with 0 categories,
  // so a brand-new club still has a way to get back to its home screen.
  if (!currentTeamId) return null

  const mid = Math.ceil(categories.length / 2)
  const leftCats = categories.slice(0, mid)
  const rightCats = categories.slice(mid)

  function selectCategory(id: string) {
    setActiveCategory(id) // also sets viewMode = 'category'
    navigate(`/team/${slug}`)
  }

  function goHome() {
    setViewMode('home')
    navigate(`/team/${slug}`)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        height: '76px',
        background: `linear-gradient(180deg, ${teamColor}30 0%, ${teamColor}12 40%, #05130a 100%)`,
        borderColor: teamColor + '30',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-stretch h-full max-w-lg mx-auto relative">
        {/* Left categories */}
        <div className="flex flex-1 items-stretch">
          {leftCats.map((cat, i) => (
            <CategoryTab
              key={cat.id}
              icon={TAB_ICONS[i % TAB_ICONS.length]}
              label={cat.name}
              active={viewMode === 'category' && activeCategoryId === cat.id}
              color={teamColor}
              onClick={() => selectCategory(cat.id)}
            />
          ))}
        </div>

        {/* Center logo button */}
        <div className="flex items-center justify-center w-20 shrink-0 relative">
          <button
            onClick={goHome}
            className="absolute -top-6 flex items-center justify-center rounded-full border-4 shadow-xl active:scale-95 transition-transform overflow-hidden"
            style={{
              width: 64, height: 64, background: teamColor,
              borderColor: viewMode === 'home' ? '#fff' : '#030712',
              boxShadow: `0 0 20px ${teamColor}80`,
            }}
          >
            {teamLogoUrl ? (
              <img src={teamLogoUrl} alt={teamName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">⚽</span>
            )}
          </button>
        </div>

        {/* Right categories */}
        <div className="flex flex-1 items-stretch">
          {rightCats.map((cat, i) => (
            <CategoryTab
              key={cat.id}
              icon={TAB_ICONS[(mid + i) % TAB_ICONS.length]}
              label={cat.name}
              active={viewMode === 'category' && activeCategoryId === cat.id}
              color={teamColor}
              onClick={() => selectCategory(cat.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}

function CategoryTab({ icon: Icon, label, active, color, onClick }: {
  icon: typeof Zap
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  // Shorten long labels for the nav
  const short = label.length > 8 ? label.toUpperCase().replace('SS ', 'SS\n') : label.toUpperCase()

  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-1 relative px-1 transition-colors"
    >
      <Icon size={16} style={{ color: active ? color : '#6b7280' }} strokeWidth={2} />
      <span
        className="text-[9px] font-bold leading-tight text-center whitespace-pre"
        style={{ color: active ? color : '#6b7280' }}
      >
        {short}
      </span>
      {active && (
        <span
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
          style={{ background: color }}
        />
      )}
    </button>
  )
}
