import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function RootLayout() {
  const { setSession } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode: skip auth
      setSession(null)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // Turn any pending invites (coordinador added this email to a squad
      // or as a club coordinador before they ever signed up) into real
      // team membership now that we know who they are.
      if (session) supabase.rpc('claim_invites').then()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Only redirect on an actual sign-out — other null-session events (e.g.
      // the initial session check) shouldn't boot someone out of a demo page.
      if (event === 'SIGNED_OUT') navigate('/login')
      else if (session) supabase.rpc('claim_invites').then()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <Outlet />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        }}
      />
    </>
  )
}
