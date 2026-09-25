import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Target, HandMetal, Square, Star, BarChart2, Users, Camera } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { mockPlayers, mockStats, mockCategories } from '@/lib/mock'
import { useTeamStore, useAuthStore } from '@/store/authStore'
import { initials } from '@/lib/utils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { uploadTeamPhoto, isMockId } from '@/lib/storage'
import { loadTeamPlayerStats, type PlayerStatRow } from '@/lib/playerStats'
import type { Player } from '@/types'
import toast from 'react-hot-toast'

export function PlayerPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { teamColor, currentTeamId, categories, memberRole } = useTeamStore()
  const { user } = useAuthStore()
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const activeCategories = categories.length > 0 ? categories : mockCategories

  const [player, setPlayer] = useState<Player | null>(
    isDemo ? (mockPlayers.find(p => p.id === playerId) ?? mockPlayers[0]) : null
  )
  const [loading, setLoading] = useState(!isDemo)
  const [realStats, setRealStats] = useState<PlayerStatRow | null>(null)
  const stats = isDemo ? mockStats.find(s => s.player_id === player?.id) : realStats
  const attendancePct: number | null = stats && 'attendance_pct' in stats ? (stats as { attendance_pct: number }).attendance_pct : null
  const category = activeCategories.find(c => c.id === player?.category_id)
  const canEditPhoto = isDemo || (!!user && player?.user_id === user.id) || memberRole === 'admin' || memberRole === 'coordinador'

  const [photoUrl, setPhotoUrl] = useState<string | null>(player?.photo_url ?? null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  async function handleUnlink() {
    if (!player) return
    setUnlinking(true)
    const { error } = await supabase.rpc('unlink_player', { p_player_id: player.id })
    setUnlinking(false)
    if (error) { toast.error(error.message); return }
    toast.success('Ficha desvinculada')
    const isSelf = user?.id === player.user_id
    if (isSelf) navigate('/teams')
    else setPlayer(p => p ? { ...p, user_id: null } : p)
  }

  useEffect(() => {
    async function load() {
      if (isDemo || !playerId) return
      setLoading(true)
      const { data, error } = await supabase.from('players').select('*').eq('id', playerId).single()
      if (error) { toast.error('No se pudo cargar el jugador'); setLoading(false); return }
      setPlayer(data)
      setPhotoUrl(data?.photo_url ?? null)
      setLoading(false)

      if (data?.team_id && playerId) {
        const teamStats = await loadTeamPlayerStats(data.team_id)
        setRealStats(teamStats.get(playerId) ?? null)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  async function handlePhotoChange(file: File) {
    if (!player) return
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }

    if (isDemo || isMockId(player.id)) {
      // Demo player — preview only, nothing to persist to
      setPhotoUrl(URL.createObjectURL(file))
      toast('Vista previa (jugador demo) — no se guarda. Cargá jugadores reales para persistir fotos.', { icon: 'ℹ️' })
      return
    }

    setUploading(true)
    try {
      const url = await uploadTeamPhoto(file, `${currentTeamId}/players/${player.id}`)
      const { error } = await supabase.rpc('player_set_photo', { p_player_id: player.id, p_photo_url: url })
      if (error) throw error
      setPhotoUrl(url)
      toast.success('Foto actualizada')
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir la foto')
    }
    setUploading(false)
  }

  if (loading || !player) {
    return (
      <div className="max-w-lg mx-auto pb-8">
        <PageHeader title="Perfil del jugador" back />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-700 rounded-full animate-spin" style={{ borderTopColor: teamColor }} />
        </div>
      </div>
    )
  }

  const statItems = [
    { label: 'Goles', value: stats?.goals ?? 0, icon: Target, color: teamColor },
    { label: 'Asistencias', value: stats?.assists ?? 0, icon: HandMetal, color: '#3b82f6' },
    { label: 'Amarillas', value: stats?.yellow_cards ?? 0, icon: Square, color: '#f59e0b' },
    { label: 'Rojas', value: stats?.red_cards ?? 0, icon: Square, color: '#ef4444' },
    { label: 'MVPs', value: stats?.mvp_votes ?? 0, icon: Star, color: '#a855f7' },
    { label: 'Partidos', value: stats?.matches_played ?? 0, icon: BarChart2, color: '#6b7280' },
  ]

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title="Perfil del jugador" back />

      {/* Hero with photo */}
      <div className="relative mx-4 mb-5">
        <div
          className="rounded-2xl overflow-hidden h-64 flex items-center justify-center"
          style={{ background: `linear-gradient(160deg, ${teamColor}25 0%, #1f2937 100%)` }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
              style={{ background: teamColor + '30', color: teamColor }}
            >
              {initials(player.name)}
            </div>
          )}

          {/* Upload overlay — only the linked player themselves or a club admin/coordinador can change it */}
          {canEditPhoto && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur transition-opacity"
              style={{ background: '#00000070', color: '#fff' }}
            >
              {uploading ? (
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              {uploading ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          )}
        </div>

        {canEditPhoto && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f) }}
          />
        )}

        {/* Name and badges */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-2 mb-1">
            {player.number && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: teamColor, color: '#030712' }}
              >
                #{player.number}
              </span>
            )}
            {category && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 text-gray-300">
                {category.name}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white drop-shadow-lg">{player.name}</h2>
          {player.position && (
            <p className="text-sm font-medium drop-shadow" style={{ color: teamColor }}>{player.position}</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Estadísticas</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {statItems.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-800 p-3 flex flex-col items-center gap-1.5"
              style={{ background: color + '10' }}
            >
              <Icon size={16} style={{ color }} />
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-gray-500 text-[10px] font-medium">{label}</p>
            </div>
          ))}
        </div>

        {stats && attendancePct !== null && (
          <div className="rounded-2xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-500" />
                <p className="text-sm text-gray-400">Asistencia a partidos</p>
              </div>
              <p className="font-black text-white">{attendancePct}%</p>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${attendancePct}%`, background: teamColor }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-1.5">
              {stats.matches_played} partido{stats.matches_played !== 1 ? 's' : ''} jugado{stats.matches_played !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        {stats && attendancePct === null && (
          <p className="text-gray-600 text-xs text-center py-2">
            {stats.matches_played > 0
              ? `${stats.matches_played} partido${stats.matches_played !== 1 ? 's' : ''} confirmado${stats.matches_played !== 1 ? 's' : ''}`
              : 'Sin estadísticas de partidos todavía'}
          </p>
        )}
        {!stats && (
          <p className="text-gray-600 text-xs text-center py-2">Sin estadísticas todavía</p>
        )}

        {!isDemo && canEditPhoto && player.user_id && (
          <div className="mt-6">
            {!confirmingUnlink ? (
              <button
                onClick={() => setConfirmingUnlink(true)}
                className="w-full text-center text-xs text-gray-600 hover:text-red-400 py-2"
              >
                ¿No sos este jugador? Desvincular ficha
              </button>
            ) : (
              <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4">
                <p className="text-red-300 text-sm font-semibold mb-1">¿Desvincular esta ficha?</p>
                <p className="text-gray-400 text-xs mb-3">
                  La ficha, sus estadísticas y fotos se conservan tal cual. Solo se quita la conexión entre tu cuenta y esta ficha —
                  vas a dejar de poder actuar como {player.name}. Podés pedirle a tu coordinador que te vincule a la ficha correcta después.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" fullWidth onClick={() => setConfirmingUnlink(false)}>Cancelar</Button>
                  <Button variant="danger" size="sm" fullWidth loading={unlinking} onClick={handleUnlink}>Desvincular</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
