import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import teamAppLogo from '@/assets/teamapp-logo.png'

const schema = z.object({
  full_name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }
    // Supabase can auto-confirm and hand back an active session here — sign
    // it out so the person lands on a real login screen instead of racing
    // AuthLayout's "already signed in" redirect (which showed as a blank
    // screen while the auth-state listener caught up).
    await supabase.auth.signOut()
    setLoading(false)
    toast.success('¡Cuenta creada! Iniciá sesión para continuar.')
    navigate('/login', redirectTo ? { state: { from: redirectTo } } : undefined)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden bg-black">
          <img src={teamAppLogo} alt="TeamApp" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
        <p className="text-gray-400 text-sm mt-1">Unite a TeamApp</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
          <input
            {...register('full_name')}
            type="text"
            placeholder="Juan Pérez"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
          {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
        </div>

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
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" state={redirectTo ? { from: redirectTo } : undefined} className="font-medium" style={{ color: 'var(--team-color)' }}>
          Iniciá sesión
        </Link>
      </p>
    </div>
  )
}
