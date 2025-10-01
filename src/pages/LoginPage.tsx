import { useEffect, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle =
  'w-full rounded-xl border border-slate-800/70 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30'

const buttonStyle =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/admin'

  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, authLoading, navigate, redirectTo])

  const buttonLabel = submitting ? 'Signing in…' : authLoading ? 'Checking session…' : 'Sign in'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required.')
      return
    }

    setSubmitting(true)
    try {
      await login({ email: trimmedEmail, password: trimmedPassword })
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to log in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night-900 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-inner shadow-black/40">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold text-white">Admin login</h1>
          <p className="text-sm text-slate-400">
            Enter the administrator credentials to manage site content, experiences, and blogs.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className={inputStyle}
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={inputStyle}
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className={buttonStyle} disabled={authLoading || submitting}>
            {buttonLabel}
          </button>
        </form>
        <div className="space-y-2 text-center text-xs text-slate-500">
          <p>Sessions expire automatically after a short period of inactivity. Close the browser to end the session sooner.</p>
          <p>
            <Link to="/" className="font-semibold text-accent-300 transition hover:text-accent-200">
              Return to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export { LoginPage }
