import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const fieldStyle =
  'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const labelStyle = 'text-sm font-medium text-slate-200'

const AdminDashboard = () => {
  const { content, loading, error, updateProfile, resetContent } = useContent()
  const { profile } = content
  const [status, setStatus] = useState<
    | { state: 'idle' }
    | { state: 'saving' }
    | { state: 'saved' }
    | { state: 'resetting' }
    | { state: 'reset' }
    | { state: 'error'; message: string }
  >({ state: 'idle' })

  const initialForm = useMemo(
    () => ({
      name: profile.name,
      title: profile.title,
      tagline: profile.tagline,
      summary: profile.summary,
      location: profile.location,
      email: profile.email,
      linkedin: profile.social.linkedin,
      github: profile.social.github,
      x: profile.social.x,
    }),
    [profile],
  )

  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    if (status.state === 'idle' || status.state === 'saving' || status.state === 'resetting') return
    const timeout = window.setTimeout(() => setStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [status])

  const handleChange = (
    field: keyof typeof form,
    transform?: (value: string) => string,
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transform ? transform(event.target.value) : event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ state: 'saving' })
    try {
      await updateProfile({
        name: form.name,
        title: form.title,
        tagline: form.tagline,
        summary: form.summary,
        location: form.location,
        email: form.email,
        social: {
          linkedin: form.linkedin,
          github: form.github,
          x: form.x,
        },
      })
      setStatus({ state: 'saved' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save profile'
      setStatus({ state: 'error', message })
    }
  }

  const handleReset = async () => {
    setStatus({ state: 'resetting' })
    try {
      await resetContent()
      setStatus({ state: 'reset' })
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Failed to reset content'
      setStatus({ state: 'error', message })
    }
  }

  const isBusy = loading || status.state === 'saving' || status.state === 'resetting'

  const statusLabel = (() => {
    switch (status.state) {
      case 'saving':
        return 'Saving changes...'
      case 'saved':
        return 'Profile updated'
      case 'resetting':
        return 'Restoring defaults...'
      case 'reset':
        return 'Defaults restored'
      case 'error':
        return status.message
      default:
        return null
    }
  })()

  return (
    <div className="min-h-screen bg-night-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-white">Admin dashboard</h1>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-accent-500/60 bg-accent-500/10 px-4 py-2 text-sm font-medium text-accent-200 transition hover:border-accent-500 hover:bg-accent-500/20"
            >
              View site
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">
            Manage the profile content that powers your public site. Updates are saved to the server and reflected on
            the landing page as soon as they persist.
          </p>
          {(statusLabel || error) && (
            <div
              role="status"
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                status.state === 'error'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-slate-700/60 bg-slate-900/60 text-slate-300'
              }`}
            >
              {statusLabel ?? error}
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="grid gap-8">
          <section className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Identity</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Name</span>
                <input className={fieldStyle} value={form.name} onChange={handleChange('name')} disabled={isBusy} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Title</span>
                <input className={fieldStyle} value={form.title} onChange={handleChange('title')} disabled={isBusy} />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Narrative</h2>
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Tagline</span>
              <input
                className={fieldStyle}
                value={form.tagline}
                onChange={handleChange('tagline')}
                maxLength={160}
                disabled={isBusy}
              />
              <span className="text-xs text-slate-500">Use a concise statement up to 160 characters.</span>
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Summary</span>
              <textarea
                className={`${fieldStyle} min-h-[140px]`}
                value={form.summary}
                onChange={handleChange('summary')}
                disabled={isBusy}
              />
            </label>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Location</span>
                <input
                  className={fieldStyle}
                  value={form.location}
                  onChange={handleChange('location')}
                  disabled={isBusy}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Email</span>
                <input
                  type="email"
                  className={fieldStyle}
                  value={form.email}
                  onChange={handleChange('email')}
                  disabled={isBusy}
                />
              </label>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>LinkedIn</span>
                <input
                  className={fieldStyle}
                  value={form.linkedin}
                  onChange={handleChange('linkedin')}
                  disabled={isBusy}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>GitHub</span>
                <input
                  className={fieldStyle}
                  value={form.github}
                  onChange={handleChange('github')}
                  disabled={isBusy}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>X (Twitter)</span>
                <input className={fieldStyle} value={form.x} onChange={handleChange('x')} disabled={isBusy} />
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Changes are stored on the server. Use restore defaults to repopulate the original profile content.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-full border border-slate-700/70 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
              >
                Restore defaults
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
              >
                Save changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export { AdminDashboard }
