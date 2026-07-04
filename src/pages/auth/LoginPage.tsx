import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import teamAppLogo from '@/assets/teamapp-logo.png'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword(data)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      navigate('/teams')
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden bg-black">
          <img src={teamAppLogo} alt="TeamApp" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">TeamApp</h1>
        <p className="text-gray-400 text-sm mt-1">Ingresá a tu equipo</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@email.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
          Ingresar
        </Button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-medium" style={{ color: 'var(--team-color)' }}>
          Registrate
        </Link>
      </p>

      {/* Demo shortcut */}
      <div className="mt-6 p-3 rounded-xl bg-gray-900 border border-gray-800">
        <p className="text-xs text-gray-500 text-center">Para ver el demo sin registrarse:</p>
        <Link
          to="/team/maestros-fc"
          className="block text-center text-xs font-medium mt-1"
          style={{ color: 'var(--team-color)' }}
        >
          Ver demo → Maestros FC
        </Link>
      </div>
    </div>
  )
}
