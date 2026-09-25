import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Camera, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { uploadTeamPhoto } from '@/lib/storage'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import teamAppLogo from '@/assets/teamapp-logo.png'

interface Preview {
  team_name: string
  team_slug: string
  category_name: string | null
  player_name: string | null
  player_number: number | null
  role: string
  valid: boolean
}

type Step = 'loading' | 'invalid' | 'auth' | 'confirm' | 'photo' | 'done'

export function InvitePage() {
  const { inviteId } = useParams<{ inviteId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [step, setStep] = useState<Step>('loading')
  const [claiming, setClaiming] = useState(false)
  const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null)
  const [claimedTeamSlug, setClaimedTeamSlug] = useState<string | null>(null)
  const [claimedTeamId, setClaimedTeamId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!inviteId) return
    supabase.rpc('get_invite_preview', { p_invite_id: inviteId }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row || !row.valid) { setStep('invalid'); return }
      setPreview(row)
      setStep(user ? 'confirm' : 'auth')
    })
  }, [inviteId, user])

  async function handleConfirm() {
    if (!inviteId) return
    setClaiming(true)
    const { data, error } = await supabase.rpc('claim_player_invite', { p_invite_id: inviteId })
    setClaiming(false)
    if (error) { toast.error(error.message); return }
    const row = Array.isArray(data) ? data[0] : data
    setClaimedTeamSlug(row?.team_slug ?? null)
    setClaimedTeamId(row?.team_id ?? null)
    setClaimedPlayerId(row?.player_id ?? null)
    toast.success('¡Listo! Ya sos vos en el plantel.')
    setStep(row?.player_id ? 'photo' : 'done')
  }

  async function handlePhoto(file: File) {
    if (!claimedPlayerId || !claimedTeamId) return
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    setUploading(true)
    try {
      const url = await uploadTeamPhoto(file, `${claimedTeamId}/players/${claimedPlayerId}`)
      await supabase.rpc('player_set_photo', { p_player_id: claimedPlayerId, p_photo_url: url })
      toast.success('Foto subida')
      setStep('done')
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir la foto')
    }
    setUploading(false)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-800 rounded-full animate-spin" style={{ borderTopColor: '#22c55e' }} />
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <EmptyState icon={<span className="text-5xl">🔗</span>} title="Invitación no válida" description="Este link ya se usó o ya no existe. Pedile a tu coordinador que te mande uno nuevo." />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 overflow-hidden bg-black">
            <img src={teamAppLogo} alt="TeamApp" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">Te invitaron a {preview?.team_name}</h1>
          {preview?.category_name && <p className="text-gray-400 text-sm mt-1">Categoría {preview.category_name}</p>}
        </div>

        {step === 'auth' && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-400 text-sm text-center mb-1">Iniciá sesión o creá tu cuenta para confirmar tu ficha.</p>
            <Button fullWidth onClick={() => navigate('/login', { state: { from: `/invite/${inviteId}` } })}>Iniciar sesión</Button>
            <Button fullWidth variant="secondary" onClick={() => navigate('/register', { state: { from: `/invite/${inviteId}` } })}>Crear cuenta</Button>
          </div>
        )}

        {step === 'confirm' && preview && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">Esta es tu ficha</p>
              <p className="text-2xl font-black text-white">{preview.player_name ?? 'Jugador'}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {preview.player_number != null && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">#{preview.player_number}</span>
                )}
                {preview.category_name && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{preview.category_name}</span>
                )}
              </div>
            </div>
            <p className="text-gray-500 text-xs text-center">
              Al confirmar, tu cuenta ({user?.email}) queda vinculada a esta ficha en {preview.team_name}.
            </p>
            <Button fullWidth loading={claiming} onClick={handleConfirm}>
              <Check size={16} /> Sí, soy yo
            </Button>
            <button onClick={() => navigate('/teams')} className="text-gray-500 text-sm flex items-center justify-center gap-1 py-1">
              <ChevronLeft size={14} /> Volver
            </button>
          </div>
        )}

        {step === 'photo' && (
          <div className="flex flex-col gap-4 items-center">
            <div className="w-28 h-28 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-gray-700">
              <Camera size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm text-center">¿Querés subir tu foto de perfil? Podés hacerlo después también.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }} />
            <Button fullWidth loading={uploading} onClick={() => fileRef.current?.click()}>Subir foto</Button>
            <button onClick={() => setStep('done')} className="text-gray-500 text-sm py-1">Hacerlo después</button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col gap-4 items-center text-center">
            <ShieldCheck size={40} className="text-green-500" />
            <p className="text-white font-semibold">¡Listo! Ya sos parte de {preview?.team_name}.</p>
            <Button fullWidth onClick={() => navigate(claimedTeamSlug ? `/team/${claimedTeamSlug}` : '/teams')}>
              Ir a mi equipo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
