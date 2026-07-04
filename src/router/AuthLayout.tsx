import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AuthLayout() {
  const { user, loading } = useAuthStore()

  if (loading && isSupabaseConfigured) return null
  if (user) return <Navigate to="/teams" replace />

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <Outlet />
    </div>
  )
}
