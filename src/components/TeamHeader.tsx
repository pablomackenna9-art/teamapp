import { useNavigate, useParams } from 'react-router-dom'
import { Bell, UserCircle2 } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'
import { mockTeam } from '@/lib/mock'
import { initials, vividDark } from '@/lib/utils'

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
      {/* Decorative stadium-lights backdrop — team-colored glow + spotlight
          cones + a crowd-texture dot pattern, purely visual, same layout for
          every club (no fabricated club-specific photo/content). */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: `radial-gradient(130% 100% at 30% -10%, ${vividDark(teamColor, 32, 70)}, transparent 62%), radial-gradient(110% 90% at 85% 5%, rgba(59,130,246,0.32), transparent 58%)` }} />
        <div className="absolute -top-10 left-[10%] w-40 h-60" style={{ background: `conic-gradient(from 205deg at 50% 0%, transparent, rgba(255,255,255,0.28), transparent 32%)`, filter: 'blur(2px)' }} />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-36 h-56" style={{ background: `conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(255,255,255,0.16), transparent 60%)`, filter: 'blur(2px)' }} />
        <div className="absolute -top-10 right-[8%] w-40 h-60" style={{ background: `conic-gradient(from 155deg at 50% 0%, transparent 65%, rgba(255,255,255,0.28), transparent)`, filter: 'blur(2px)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.2px)', backgroundSize: '13px 13px', maskImage: 'radial-gradient(ellipse at 30% 10%, black 45%, transparent 80%)' }} />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 -60px 60px -20px #0a0e14' }} />
      </div>

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/team/${slug}/news`)}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Noticias"
          >
            <Bell size={16} />
          </button>
          <button
            onClick={() => navigate(`/team/${slug}/more`)}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Más"
          >
            <UserCircle2 size={18} />
          </button>
        </div>
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
