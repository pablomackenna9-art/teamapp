import { NavLink, useParams } from 'react-router-dom'
import { Home, Users, Calendar, BarChart2, MoreHorizontal } from 'lucide-react'

const tabs = [
  { label: 'Inicio', icon: Home, path: '' },
  { label: 'Plantel', icon: Users, path: 'squad' },
  { label: 'Partidos', icon: Calendar, path: 'matches' },
  { label: 'Stats', icon: BarChart2, path: 'stats' },
  { label: 'Más', icon: MoreHorizontal, path: 'more' },
]

export function BottomNav() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {tabs.map(({ label, icon: Icon, path }) => {
          const to = `/team/${slug}${path ? '/' + path : ''}`
          return (
            <NavLink
              key={label}
              to={to}
              end={path === ''}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 px-4 min-w-0 flex-1 transition-colors ${
                  isActive ? 'team-accent' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
