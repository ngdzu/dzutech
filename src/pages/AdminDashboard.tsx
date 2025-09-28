import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const fieldStyle =
  'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const labelStyle = 'text-sm font-medium text-slate-200'

type ActionStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'resetting' }
  | { state: 'reset' }
  | { state: 'error'; message: string }

const AdminDashboard = () => {
  const { content, loading, error, updateProfile, updateSections, resetContent } = useContent()
  const { profile, sections } = content
  const [status, setStatus] = useState<ActionStatus>({ state: 'idle' })
  const [sectionsStatus, setSectionsStatus] = useState<ActionStatus>({ state: 'idle' })

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

  const sectionsInitialForm = useMemo(
    () => ({
      aboutDescription: sections.about.description,
      contactDescription: sections.contact.description,
    }),
    [sections],
  )

  const [sectionsForm, setSectionsForm] = useState(sectionsInitialForm)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    setSectionsForm(sectionsInitialForm)
  }, [sectionsInitialForm])

  useEffect(() => {
    if (status.state === 'idle' || status.state === 'saving' || status.state === 'resetting') return
    const timeout = window.setTimeout(() => setStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    if (sectionsStatus.state === 'idle' || sectionsStatus.state === 'saving' || sectionsStatus.state === 'resetting')
      return
    const timeout = window.setTimeout(() => setSectionsStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [sectionsStatus])

  const handleChange = (
    field: keyof typeof form,
    transform?: (value: string) => string,
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transform ? transform(event.target.value) : event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleSectionsChange = (field: keyof typeof sectionsForm) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setSectionsForm((prev) => ({ ...prev, [field]: event.target.value }))
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

  const handleSectionsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSectionsStatus({ state: 'saving' })
    const nextSections = {
      about: {
        description: sectionsForm.aboutDescription.trim(),
      },
      contact: {
        description: sectionsForm.contactDescription.trim(),
      },
    }

    try {
      await updateSections(nextSections)
      setSectionsStatus({ state: 'saved' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save sections'
      setSectionsStatus({ state: 'error', message })
    }
  }

  const handleReset = async () => {
    setStatus({ state: 'resetting' })
    setSectionsStatus({ state: 'resetting' })
    try {
      await resetContent()
      setStatus({ state: 'reset' })
      setSectionsStatus({ state: 'reset' })
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Failed to reset content'
      setStatus({ state: 'error', message })
      setSectionsStatus({ state: 'error', message })
    }
  }

  const profileBusy = loading || status.state === 'saving' || status.state === 'resetting'
  const sectionsBusy =
    loading || status.state === 'resetting' || sectionsStatus.state === 'saving' || sectionsStatus.state === 'resetting'

  const getStatusLabel = (currentStatus: ActionStatus, scope: 'profile' | 'sections') => {
    switch (currentStatus.state) {
      case 'saving':
        return scope === 'profile' ? 'Saving profile...' : 'Saving section copy...'
      case 'saved':
        return scope === 'profile' ? 'Profile updated' : 'Section copy updated'
      case 'resetting':
        return 'Restoring defaults...'
      case 'reset':
        return 'Defaults restored'
      case 'error':
        return currentStatus.message
      default:
        return null
    }
  }

  const profileStatusLabel = getStatusLabel(status, 'profile')
  const sectionsStatusLabel = getStatusLabel(sectionsStatus, 'sections')

  const statusMessages = [
    profileStatusLabel && {
      message: profileStatusLabel,
      tone: status.state === 'error' ? 'error' : 'default',
    },
    sectionsStatusLabel && {
      message: sectionsStatusLabel,
      tone: sectionsStatus.state === 'error' ? 'error' : 'default',
    },
  ]
    .filter((item): item is { message: string; tone: 'error' | 'default' } => Boolean(item))
    .concat(error ? [{ message: error, tone: 'error' as const }] : [])

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
          {statusMessages.length > 0 && (
            <div className="flex flex-wrap gap-2" role="status">
              {statusMessages.map(({ message, tone }, index) => (
                <div
                  key={`${tone}-${index}-${message}`}
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                    tone === 'error'
                      ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-slate-700/60 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  {message}
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="grid gap-10">
          <form onSubmit={handleSubmit} className="grid gap-8">
            <section className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Identity</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelStyle}>Name</span>
                  <input
                    className={fieldStyle}
                    value={form.name}
                    onChange={handleChange('name')}
                    disabled={profileBusy}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelStyle}>Title</span>
                  <input
                    className={fieldStyle}
                    value={form.title}
                    onChange={handleChange('title')}
                    disabled={profileBusy}
                  />
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
                  disabled={profileBusy}
                />
                <span className="text-xs text-slate-500">Use a concise statement up to 160 characters.</span>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Summary</span>
                <textarea
                  className={`${fieldStyle} min-h-[140px]`}
                  value={form.summary}
                  onChange={handleChange('summary')}
                  disabled={profileBusy}
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
                    disabled={profileBusy}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelStyle}>Email</span>
                  <input
                    type="email"
                    className={fieldStyle}
                    value={form.email}
                    onChange={handleChange('email')}
                    disabled={profileBusy}
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
                    disabled={profileBusy}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelStyle}>GitHub</span>
                  <input
                    className={fieldStyle}
                    value={form.github}
                    onChange={handleChange('github')}
                    disabled={profileBusy}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelStyle}>X (Twitter)</span>
                  <input
                    className={fieldStyle}
                    value={form.x}
                    onChange={handleChange('x')}
                    disabled={profileBusy}
                  />
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
                  disabled={profileBusy}
                >
                  Restore defaults
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={profileBusy}
                >
                  Save changes
                </button>
              </div>
            </div>
          </form>

          <form
            onSubmit={handleSectionsSubmit}
            className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Site sections</h2>
              <p className="text-sm text-slate-400">
                Update the descriptive copy for the About and Contact sections on the landing page.
              </p>
            </div>
            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>About section description</span>
                <textarea
                  className={`${fieldStyle} min-h-[140px]`}
                  value={sectionsForm.aboutDescription}
                  onChange={handleSectionsChange('aboutDescription')}
                  disabled={sectionsBusy}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Contact section description</span>
                <textarea
                  className={`${fieldStyle} min-h-[140px]`}
                  value={sectionsForm.contactDescription}
                  onChange={handleSectionsChange('contactDescription')}
                  disabled={sectionsBusy}
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Changes are saved to the server and immediately reflected on the live site.
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={sectionsBusy}
              >
                Save section copy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export { AdminDashboard }
