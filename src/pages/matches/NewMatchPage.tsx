import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

interface FormData {
  rival: string
  date: string
  location: string
  type: 'official' | 'friendly'
  status: 'upcoming' | 'played' | 'suspended'
  home_score: number
  away_score: number
}

const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"

const TYPES: Array<['official' | 'friendly', string]> = [['official', 'Oficial'], ['friendly', 'Amistoso']]
const STATUSES: Array<['upcoming' | 'played' | 'suspended', string]> = [['upcoming', 'Próximo'], ['played', 'Jugado'], ['suspended', 'Suspendido']]

export function NewMatchPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: { type: 'official', status: 'upcoming', home_score: 0, away_score: 0 },
  })

  const status = watch('status')
  const matchType = watch('type')
  const matchStatus = watch('status')

  async function onSubmit(_data: FormData) {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    toast.success('Partido creado')
    navigate(`/team/${slug}/matches`)
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title="Nuevo partido" back />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Rival *</label>
              <input {...register('rival', { required: true })} placeholder="Los Pumas FC" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Fecha y hora *</label>
              <input {...register('date', { required: true })} type="datetime-local" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Lugar</label>
              <input {...register('location')} placeholder="Cancha Municipal" className={inputClass} />
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-3">Tipo de partido</p>
          <div className="flex gap-3">
            {TYPES.map(([val, label]) => (
              <label key={val} className="flex-1 cursor-pointer">
                <input type="radio" {...register('type')} value={val} className="sr-only" />
                <div
                  className="text-center py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={matchType === val
                    ? { borderColor: 'var(--team-color)', color: 'var(--team-color)', background: 'var(--team-color-dim)' }
                    : { borderColor: '#374151', color: '#9ca3af' }
                  }
                >
                  {label}
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-300 mb-3">Estado</p>
          <div className="flex gap-2">
            {STATUSES.map(([val, label]) => (
              <label key={val} className="flex-1 cursor-pointer">
                <input type="radio" {...register('status')} value={val} className="sr-only" />
                <div
                  className="text-center py-2 rounded-xl border text-xs font-medium transition-colors"
                  style={matchStatus === val
                    ? { borderColor: 'var(--team-color)', color: 'var(--team-color)', background: 'var(--team-color-dim)' }
                    : { borderColor: '#374151', color: '#9ca3af' }
                  }
                >
                  {label}
                </div>
              </label>
            ))}
          </div>

          {status === 'played' && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Nuestros goles</label>
                <input {...register('home_score', { valueAsNumber: true })} type="number" min={0} className={inputClass + ' text-center text-2xl font-black'} />
              </div>
              <span className="text-gray-600 text-2xl font-light mt-5">-</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Goles rival</label>
                <input {...register('away_score', { valueAsNumber: true })} type="number" min={0} className={inputClass + ' text-center text-2xl font-black'} />
              </div>
            </div>
          )}
        </Card>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Crear partido
        </Button>
      </form>
    </div>
  )
}
