import { useNavigate, useParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'
import { mockTeam } from '@/lib/mock'
import { initials } from '@/lib/utils'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ADMIN',
  captain: 'CAPITÁN',
  player: 'JUGADOR',
  dt: 'DT',
  coordinador: 'COORDINADOR',
}

export function TeamHeader() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { teamColor, teamLogoUrl, teamName, memberRole } = useTeamStore()

  const name = teamName || mockTeam.name
  const roleLabel = ROLE_LABEL[memberRole ?? 'player'] ?? 'JUGADOR'
  const roleColor = memberRole === 'admin' ? '#f59e0b' : memberRole === 'captain' ? '#3b82f6' : memberRole === 'dt' || memberRole === 'coordinador' ? '#a855f7' : teamColor

  return (
    <div className="relative px-4 pt-5 pb-6 mb-1 overflow-hidden">
      {/* Top row: greeting + settings */}
      <div className="relative flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-bold text-sm leading-tight">{getGreeting()} 👋</p>
          <span
            className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: roleColor + '25', color: roleColor }}
          >
            {roleLabel}
          </span>
        </div>
        <button
          onClick={() => navigate(`/team/${slug}/more`)}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Escudo grande + nombre del club */}
      <div className="relative flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-3xl overflow-hidden border-4 flex items-center justify-center shadow-lg"
          style={{ borderColor: teamColor + '70', background: teamColor + '15' }}
        >
          {teamLogoUrl ? (
            <img src={teamLogoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black" style={{ color: teamColor }}>
              {initials(name)}
            </span>
          )}
        </div>
        <h1 className="text-white font-black text-xl mt-3 tracking-tight">{name}</h1>
      </div>
    </div>
  )
}
