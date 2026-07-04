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
}

export function TeamHeader() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { teamColor, teamLogoUrl, teamName, memberRole } = useTeamStore()

  const name = teamName || mockTeam.name
  const roleLabel = ROLE_LABEL[memberRole ?? 'player'] ?? 'JUGADOR'
  const roleColor = memberRole === 'admin' ? '#f59e0b' : memberRole === 'captain' ? '#3b82f6' : memberRole === 'dt' ? '#a855f7' : teamColor

  return (
    <div className="px-4 pt-4 pb-3 flex items-center gap-3">
      {/* Avatar + greeting */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0"
        style={{ background: teamColor, color: '#030712' }}
      >
        {initials(name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base leading-tight">{getGreeting()} 👋</p>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: roleColor + '25', color: roleColor }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Team logo + settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/team/${slug}/more`)}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Settings size={16} />
        </button>

        <button
          onClick={() => navigate(`/team/${slug}/more`)}
          className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: teamColor + '60', background: teamColor + '20' }}
        >
          {teamLogoUrl ? (
            <img src={teamLogoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black" style={{ color: teamColor }}>
              {initials(name).slice(0, 1)}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
