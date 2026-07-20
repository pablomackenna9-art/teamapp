import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { uploadTeamPhoto } from '@/lib/storage'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react'
import type { League } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  sport: z.enum(['football', 'hockey', 'basketball', 'volleyball', 'other']),
  primary_color: z.string(),
  secondary_color: z.string(),
})

type FormData = z.infer<typeof schema>

const SPORT_LABELS = {
  football: '⚽ Fútbol',
  hockey: '🏑 Hockey',
  basketball: '🏀 Básquet',
  volleyball: '🏐 Vóley',
  other: '🎽 Otro',
}

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function NewTeamPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [sponsorFile, setSponsorFile] = useState<File | null>(null)
  const [sponsorPreview, setSponsorPreview] = useState<string | null>(null)
  const [categoryNames, setCategoryNames] = useState<string[]>([''])
  const [coordinadorEmail, setCoordinadorEmail] = useState('')
  const [leagues, setLeagues] = useState<League[]>([])
  const [leagueId, setLeagueId] = useState<string>('')

  useEffect(() => {
    supabase.from('leagues').select('*').order('name').then(({ data }) => setLeagues(data ?? []))
  }, [])
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sport: 'football', primary_color: '#22c55e', secondary_color: '#3b82f6' },
  })

  const primaryColor = watch('primary_color')
  const secondaryColor = watch('secondary_color')

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function onSubmit(data: FormData) {
    if (!user) { toast.error('Necesitás estar autenticado'); return }
    setLoading(true)

    // Team creation + admin membership happen atomically server-side (see
    // migration 011_create_team_rpc.sql) so there's no client-side RLS
    // chicken-and-egg: creating a team and immediately reading it back
    // would otherwise fail until the membership row exists.
    const { data: team, error } = await supabase.rpc('create_team', {
      p_name: data.name,
      p_slug: data.slug,
      p_sport: data.sport,
      p_primary_color: data.primary_color,
      p_secondary_color: data.secondary_color,
    })

    if (error) {
      setLoading(false)
      if (error.message.includes('create_team')) {
        toast.error('Falta aplicar la última actualización de la base de datos (011_create_team_rpc.sql). Corré ese script en el SQL Editor de Supabase.')
      } else {
        toast.error(error.message)
      }
      return
    }

    if (leagueId) {
      const { error: leagueError } = await supabase.from('teams').update({ league_id: leagueId }).eq('id', team.id)
      if (leagueError) toast.error('El equipo se creó, pero no se pudo asignar la liga: ' + leagueError.message)
    }

    const validCategories = categoryNames.map(c => c.trim()).filter(Boolean)
    let createdCategories: { id: string }[] = []
    if (validCategories.length > 0) {
      const { data: catRows, error: catError } = await supabase.from('categories').insert(
        validCategories.map(name => ({ team_id: team.id, name }))
      ).select()
      if (catError) toast.error('El equipo se creó, pero no se pudieron crear las categorías: ' + catError.message)
      else createdCategories = catRows ?? []
    }

    // Sponsor is optional — if the super admin picked one, upload it now that
    // the team (and its categories) exist, and apply it to every category
    // just created. Sponsors live per-category, not per-club.
    if (sponsorFile && createdCategories.length > 0) {
      try {
        const url = await uploadTeamPhoto(sponsorFile, `${team.id}/sponsor`)
        await supabase.from('categories').update({ sponsor_url: url }).in('id', createdCategories.map(c => c.id))
      } catch {
        toast.error('El equipo se creó, pero no se pudo subir el auspiciador. Podés agregarlo después.')
      }
    }

    if (coordinadorEmail.trim()) {
      const { error: inviteError } = await supabase.from('team_invites').insert({
        team_id: team.id, email: coordinadorEmail.trim(), role: 'coordinador',
      })
      if (inviteError) toast.error('El equipo se creó, pero no se pudo invitar al coordinador: ' + inviteError.message)
    }

    setLoading(false)
    toast.success('¡Equipo creado!')
    navigate(`/team/${team.slug}`)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto">
      <PageHeader title="Nuevo equipo" back />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-8 flex flex-col gap-5">
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre del equipo</label>
              <input
                {...register('name')}
                placeholder="Maestros FC"
                onChange={e => {
                  register('name').onChange(e)
                  setValue('slug', slugify(e.target.value))
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug (URL del equipo)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">/team/</span>
                <input
                  {...register('slug')}
                  placeholder="maestros-fc"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Liga (opcional)</label>
              <select
                value={leagueId}
                onChange={e => setLeagueId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none"
              >
                <option value="">Sin liga</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Deporte</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SPORT_LABELS).map(([value, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" {...register('sport')} value={value} className="sr-only" />
                    <div className={`text-center py-2.5 rounded-xl border text-sm transition-colors ${
                      watch('sport') === value
                        ? 'border-current font-semibold'
                        : 'border-gray-700 text-gray-400'
                    }`} style={watch('sport') === value ? { borderColor: primaryColor, color: primaryColor, background: primaryColor + '26' } : {}}>
                      {label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-3">Color principal</p>
          <div className="flex gap-3 flex-wrap">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('primary_color', color)}
                className="w-9 h-9 rounded-full border-2 transition-transform active:scale-90"
                style={{
                  background: color,
                  borderColor: primaryColor === color ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="text-sm text-gray-400">Personalizado:</label>
            <input
              type="color"
              value={primaryColor}
              onChange={e => setValue('primary_color', e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-gray-700"
            />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-3">Color secundario</p>
          <div className="flex gap-3 flex-wrap">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('secondary_color', color)}
                className="w-9 h-9 rounded-full border-2 transition-transform active:scale-90"
                style={{
                  background: color,
                  borderColor: secondaryColor === color ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="text-sm text-gray-400">Personalizado:</label>
            <input
              type="color"
              value={secondaryColor}
              onChange={e => setValue('secondary_color', e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-gray-700"
            />
          </div>

          {/* Preview of both colors together */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-500">Vista previa:</span>
            <div className="flex-1 h-8 rounded-lg overflow-hidden flex">
              <div className="flex-1" style={{ background: primaryColor }} />
              <div className="flex-1" style={{ background: secondaryColor }} />
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-1">Categorías</p>
          <p className="text-xs text-gray-500 mb-3">
            Ej: Junior, Senior, Femenino. Podés agregar más después desde Configuración.
          </p>
          <div className="flex flex-col gap-2">
            {categoryNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={e => setCategoryNames(prev => prev.map((c, idx) => idx === i ? e.target.value : c))}
                  placeholder={`Categoría ${i + 1}`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none"
                />
                {categoryNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCategoryNames(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-500 hover:text-red-400 shrink-0 p-1.5"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCategoryNames(prev => [...prev, ''])}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 text-xs font-semibold"
          >
            <Plus size={14} /> Agregar categoría
          </button>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-1">Coordinador (opcional)</p>
          <p className="text-xs text-gray-500 mb-3">
            Ingresá su correo — cuando entre a la app con ese mail, va a tener acceso de coordinador a este equipo.
          </p>
          <input
            type="email"
            value={coordinadorEmail}
            onChange={e => setCoordinadorEmail(e.target.value)}
            placeholder="coordinador@email.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none"
          />
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-1">Auspiciador (opcional)</p>
          <p className="text-xs text-gray-500 mb-3">
            Se asigna a todas las categorías que crees arriba (podés cambiarlo por categoría después desde Configuración).
          </p>
          {sponsorPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black" style={{ height: 100 }}>
              <img src={sponsorPreview} alt="Auspiciador" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setSponsorFile(null); setSponsorPreview(null) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-gray-700 text-gray-500 cursor-pointer hover:text-gray-300 hover:border-gray-600">
              <ImagePlus size={22} />
              <span className="text-xs font-semibold">Elegir imagen</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setSponsorFile(file)
                  setSponsorPreview(URL.createObjectURL(file))
                }}
              />
            </label>
          )}
        </Card>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Crear equipo
        </Button>
      </form>
    </div>
  )
}
