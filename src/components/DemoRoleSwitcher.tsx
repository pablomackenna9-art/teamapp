import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, X, Crown, ClipboardList, Shirt, Users } from 'lucide-react'
import { useTeamStore } from '@/store/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isMockId } from '@/lib/storage'
import type { UserRole } from '@/types'
import toast from 'react-hot-toast'

const ROLES: { key: UserRole | 'superadmin'; label: string; icon: typeof Users; desc: string }[] = [
  { key: 'player', label: 'Jugador', icon: Users, desc: 'Vota MVP, confirma asistencia, ve su plantel' },
  { key: 'coordinador', label: 'Coordinador', icon: ClipboardList, desc: 'Carga partidos, noticias, resultados y fixture' },
  { key: 'dt', label: 'DT', icon: Shirt, desc: 'Arma la formación y ve confirmados por posición' },
  { key: 'superadmin', label: 'Super Admin', icon: Crown, desc: 'Ve y gestiona todos los clubes de la plataforma' },
]

export function DemoRoleSwitcher() {
  const navigate = useNavigate()
  const { currentTeamId, memberRole, isPlatformAdminPreview, setDemoPreviewRole } = useTeamStore()
  const [open, setOpen] = useState(false)

  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  if (!isDemo) return null

  const current = isPlatformAdminPreview
    ? ROLES.find(r => r.key === 'superadmin')!
    : ROLES.find(r => r.key === memberRole) ?? ROLES[1]

  function selectRole(key: UserRole | 'superadmin') {
    if (key === 'superadmin') {
      setDemoPreviewRole('admin', true)
      toast.success('Viendo como Super Admin — anda a "Todos los equipos"')
      navigate('/teams')
    } else {
      setDemoPreviewRole(key, false)
      toast.success(`Viendo como ${ROLES.find(r => r.key === key)?.label}`)
    }
    setOpen(false)
  }

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-xl text-xs font-bold"
        style={{ bottom: 84, right: 12, background: '#111827', color: '#e5e7eb', border: '1px solid #374151' }}
      >
        <Eye size={13} />
        {current.label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-lg">Modo demostración</h2>
                <p className="text-gray-500 text-xs mt-0.5">Previsualizá la app como cada rol la ve</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-2">
              {ROLES.map(r => {
                const isActive = current.key === r.key
                return (
                  <button
                    key={r.key}
                    onClick={() => selectRole(r.key)}
                    className="flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
                    style={isActive
                      ? { background: 'var(--team-color-dim)', borderColor: 'var(--team-color)' }
                      : { background: '#111827', borderColor: '#1f2937' }
                    }
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isActive ? 'var(--team-color)' : '#1f2937' }}
                    >
                      <r.icon size={16} color={isActive ? '#030712' : '#9ca3af'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold">{r.label}</p>
                      <p className="text-gray-500 text-xs">{r.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
