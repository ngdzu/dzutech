import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night-900 text-slate-300">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/60 px-10 py-8 text-center shadow-inner shadow-black/40">
          <span className="text-sm uppercase tracking-[0.4em] text-accent-300/80">Loading</span>
          <p className="max-w-xs text-sm text-slate-400">
            Verifying your session. This usually takes just a moment.
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" state={{ from }} replace />
  }

  return <>{children}</>
}

export { RequireAuth }
