import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Home, Calendar, Shirt, Trophy, Menu } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'

const SECTIONS = [
  { key: '', label: 'Inicio', icon: Home },
  { key: 'fixture', label: 'Partidos', icon: Calendar },
  { key: 'squad', label: 'Plantel', icon: Shirt },
  { key: 'standings', label: 'Tabla', icon: Trophy },
  { key: 'more', label: 'Más', icon: Menu },
]

export function BottomSectionNav() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { teamColor, currentTeamId } = useTeamStore()

  if (!currentTeamId) return null

  const base = `/team/${slug}`
  const currentPath = location.pathname.replace(base, '').replace(/^\//, '')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ height: '68px', background: '#0a0f18', borderColor: '#1f2937' }}
    >
      <div className="flex items-stretch h-full max-w-lg mx-auto">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = currentPath === key || (key === '' && currentPath === '')
          return (
            <button
              key={key}
              onClick={() => navigate(`${base}${key ? `/${key}` : ''}`)}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <Icon size={20} style={{ color: active ? teamColor : '#6b7280' }} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold" style={{ color: active ? teamColor : '#6b7280' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
