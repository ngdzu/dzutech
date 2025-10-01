import { useState } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const actionButtonStyle =
  'inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-rose-400/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'

const AdminSessionActions = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setPending(true)
    setError(null)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (logoutError) {
      console.error('Failed to log out', logoutError)
      const message = logoutError instanceof Error ? logoutError.message : 'Unable to log out. Please try again.'
      setError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      {user && (
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
          Signed in as <span className="ml-1 text-slate-100">{user.email}</span>
        </p>
      )}
      <button type="button" onClick={handleLogout} className={actionButtonStyle} disabled={pending}>
        <FiLogOut />
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p className="max-w-[16rem] text-xs text-rose-300">{error}</p>}
    </div>
  )
}

export { AdminSessionActions }
