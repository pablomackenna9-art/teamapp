import { useNavigate, useParams } from 'react-router-dom'
import { useTeamStore } from '@/store/authStore'

// Category pills right under the club hero — Junior/Senior/etc. Switching
// one updates Inicio's category-scoped content (matches, tabla, sponsor...).
export function CategoryNav() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { categories, activeCategoryId, viewMode, setActiveCategory, teamColor, currentTeamId } = useTeamStore()

  if (!currentTeamId || categories.length === 0) return null

  function selectCategory(id: string) {
    setActiveCategory(id) // also sets viewMode = 'category'
    navigate(`/team/${slug}`)
  }

  return (
    <div className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar max-w-lg mx-auto">
      {categories.map(cat => {
        const active = viewMode === 'category' && activeCategoryId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            style={active ? { background: teamColor, color: '#030712' } : { background: '#ffffff12', color: '#d1d5db' }}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
