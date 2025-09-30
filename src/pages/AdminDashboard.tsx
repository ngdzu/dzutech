import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import type { SiteLogo, SiteMeta } from '../content'

const fieldStyle =
  'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const labelStyle = 'text-sm font-medium text-slate-200'

const allowedLogoTypes = new Set(['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'])
const MAX_LOGO_SIZE_BYTES = 512 * 1024

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

type SiteFormState = Pick<SiteMeta, 'title' | 'description' | 'homeButtonMode' | 'logo'>

type ProfileFormState = {
  name: string
  title: string
  tagline: string
  summary: string
  location: string
  email: string
  linkedin: string
  github: string
  showEmail: boolean
  showLinkedin: boolean
  showGithub: boolean
  highlightsEnabled: boolean
  availabilityValue: string
  focusAreasValue: string
}

type ProfileFormTextField = Exclude<
  keyof ProfileFormState,
  'showEmail' | 'showLinkedin' | 'showGithub' | 'highlightsEnabled'
>

type ExperienceFormEntry = {
  role: string
  company: string
  year: string
  description: string
  achievementsInput: string
  stackInput: string
}

const AVAILABILITY_MAX_LENGTH = 50
const FOCUS_AREAS_MAX_LENGTH = 80
const EMPTY_HIGHLIGHT = { value: '', enabled: false } as const

type ActionStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'resetting' }
  | { state: 'reset' }
  | { state: 'error'; message: string }

const AdminDashboard = () => {
  const {
    content,
    loading,
    error,
    updateSite,
    updateProfile,
    updateSections,
    updateExperiences,
    resetContent,
  } = useContent()
  const { site, profile, sections, experiences } = content
  const [siteStatus, setSiteStatus] = useState<ActionStatus>({ state: 'idle' })
  const [status, setStatus] = useState<ActionStatus>({ state: 'idle' })
  const [sectionsStatus, setSectionsStatus] = useState<ActionStatus>({ state: 'idle' })
  const sectionNav = useMemo(
    () => [
      { id: 'site-metadata', label: 'Site metadata' },
      { id: 'profile-identity', label: 'Identity' },
      { id: 'profile-narrative', label: 'Narrative' },
      { id: 'profile-contact', label: 'Contact' },
      { id: 'experiences', label: 'Experiences' },
      { id: 'site-sections', label: 'Site sections' },
    ],
    [],
  )
  const [activeSection, setActiveSection] = useState<string>(sectionNav[0]?.id ?? '')

  const siteInitialForm = useMemo<SiteFormState>(
    () => ({
      title: site.title,
      description: site.description,
      homeButtonMode: site.homeButtonMode ?? 'text',
      logo: site.logo ? { ...site.logo } : null,
    }),
    [site],
  )

  const [siteForm, setSiteForm] = useState<SiteFormState>(siteInitialForm)

  const initialForm = useMemo<ProfileFormState>(() => {
    const availabilityHighlight = profile.availability ?? EMPTY_HIGHLIGHT
    const focusAreasHighlight = profile.focusAreas ?? EMPTY_HIGHLIGHT
    const highlightsEnabled =
      typeof profile.highlightsEnabled === 'boolean' ? profile.highlightsEnabled : true

    return {
      name: profile.name,
      title: profile.title,
      tagline: profile.tagline,
      summary: profile.summary,
      location: profile.location,
      email: profile.email,
      linkedin: profile.social.linkedin,
      github: profile.social.github,
      showEmail:
        typeof profile.contactVisibility?.email === 'boolean'
          ? profile.contactVisibility.email
          : true,
      showLinkedin:
        typeof profile.contactVisibility?.linkedin === 'boolean'
          ? profile.contactVisibility.linkedin
          : true,
      showGithub:
        typeof profile.contactVisibility?.github === 'boolean'
          ? profile.contactVisibility.github
          : true,
      highlightsEnabled,
      availabilityValue: typeof availabilityHighlight.value === 'string' ? availabilityHighlight.value : '',
      focusAreasValue: typeof focusAreasHighlight.value === 'string' ? focusAreasHighlight.value : '',
    }
  }, [profile])

  const [form, setForm] = useState<ProfileFormState>(initialForm)

  const sectionsInitialForm = useMemo(
    () => ({
      contactDescription: sections.contact?.description ?? '',
    }),
    [sections],
  )

  const [sectionsForm, setSectionsForm] = useState(sectionsInitialForm)
  const createEmptyExperience = (): ExperienceFormEntry => ({
    role: '',
    company: '',
    year: '',
    description: '',
    achievementsInput: '',
    stackInput: '',
  })

  const experiencesInitialForm = useMemo<ExperienceFormEntry[]>(() => {
    if (experiences.length === 0) {
      return [createEmptyExperience()]
    }

    return experiences.map((experience) => ({
      role: experience.role,
      company: experience.company,
      year: experience.year,
      description: experience.description,
      achievementsInput: experience.achievements.join('\n'),
      stackInput: experience.stack.join(', '),
    }))
  }, [experiences])

  const [experiencesForm, setExperiencesForm] = useState<ExperienceFormEntry[]>(experiencesInitialForm)
  const [experiencesStatus, setExperiencesStatus] = useState<ActionStatus>({ state: 'idle' })

  useEffect(() => {
    setSiteForm(siteInitialForm)
  }, [siteInitialForm])

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  useEffect(() => {
    setSectionsForm(sectionsInitialForm)
  }, [sectionsInitialForm])

  useEffect(() => {
    setExperiencesForm(experiencesInitialForm)
  }, [experiencesInitialForm])

  useEffect(() => {
    if (status.state === 'idle' || status.state === 'saving' || status.state === 'resetting') return
    const timeout = window.setTimeout(() => setStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    if (siteStatus.state === 'idle' || siteStatus.state === 'saving' || siteStatus.state === 'resetting') return
    const timeout = window.setTimeout(() => setSiteStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [siteStatus])

  useEffect(() => {
    if (sectionsStatus.state === 'idle' || sectionsStatus.state === 'saving' || sectionsStatus.state === 'resetting')
      return
    const timeout = window.setTimeout(() => setSectionsStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [sectionsStatus])

  useEffect(() => {
    if (
      experiencesStatus.state === 'idle' ||
      experiencesStatus.state === 'saving' ||
      experiencesStatus.state === 'resetting'
    )
      return
    const timeout = window.setTimeout(() => setExperiencesStatus({ state: 'idle' }), 2500)
    return () => window.clearTimeout(timeout)
  }, [experiencesStatus])

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    sectionNav.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [sectionNav])

  const handleChange = (
    field: ProfileFormTextField,
    transform?: (value: string) => string,
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transform ? transform(event.target.value) : event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleHighlightsToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, highlightsEnabled: event.target.checked }))
  }

  const handleContactToggle = (field: 'showEmail' | 'showLinkedin' | 'showGithub') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.checked }))
    }

  const handleSiteTextChange = (field: 'title' | 'description') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSiteForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleHomeButtonModeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.value === 'logo' ? 'logo' : 'text'
    setSiteForm((prev) => ({ ...prev, homeButtonMode: mode }))
  }

  const handleLogoAltChange = (event: ChangeEvent<HTMLInputElement>) => {
    const altValue = event.target.value
    setSiteForm((prev) => (prev.logo ? { ...prev, logo: { ...prev.logo, alt: altValue } } : prev))
  }

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSiteForm((prev) => ({ ...prev, logo: null }))
      return
    }

    if (!allowedLogoTypes.has(file.type)) {
      setSiteStatus({ state: 'error', message: 'Logo must be PNG, SVG, JPG, or WEBP' })
      event.target.value = ''
      return
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setSiteStatus({ state: 'error', message: 'Logo must be smaller than 512KB' })
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setSiteForm((prev) => ({
        ...prev,
        logo: {
          data: dataUrl,
          type: file.type,
          ...(prev.logo?.alt ? { alt: prev.logo.alt } : {}),
        },
      }))
      setSiteStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
    } catch (uploadError) {
      console.error('Failed to load logo', uploadError)
      setSiteStatus({ state: 'error', message: 'Unable to read logo file' })
    } finally {
      event.target.value = ''
    }
  }

  const handleLogoClear = () => {
    setSiteForm((prev) => ({ ...prev, logo: null, homeButtonMode: prev.homeButtonMode === 'logo' ? 'text' : prev.homeButtonMode }))
    setSiteStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
  }

  const handleSectionsChange = (field: keyof typeof sectionsForm) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setSectionsForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleExperienceTextChange = (
    index: number,
    field: 'role' | 'company' | 'year' | 'description',
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setExperiencesForm((prev) =>
        prev.map((experience, currentIndex) =>
          currentIndex === index ? { ...experience, [field]: value } : experience,
        ),
      )
      setExperiencesStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
    }

  const handleExperienceAchievementsChange = (index: number) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value
      setExperiencesForm((prev) =>
        prev.map((experience, currentIndex) =>
          currentIndex === index ? { ...experience, achievementsInput: value } : experience,
        ),
      )
      setExperiencesStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
    }

  const handleExperienceStackChange = (index: number) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setExperiencesForm((prev) =>
        prev.map((experience, currentIndex) =>
          currentIndex === index ? { ...experience, stackInput: value } : experience,
        ),
      )
      setExperiencesStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
    }

  const handleAddExperience = () => {
    setExperiencesForm((prev) => [...prev, createEmptyExperience()])
    setExperiencesStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
  }

  const handleRemoveExperience = (index: number) => {
    setExperiencesForm((prev) => {
      if (prev.length <= 1) {
        return [createEmptyExperience()]
      }
      return prev.filter((_, currentIndex) => currentIndex !== index)
    })
    setExperiencesStatus((prev) => (prev.state === 'error' ? { state: 'idle' } : prev))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ state: 'saving' })
    const trimmedLocation = form.location.trim()
    const trimmedAvailability = form.availabilityValue.trim()
    const trimmedFocusAreas = form.focusAreasValue.trim()
    const trimmedLinkedin = form.linkedin.trim()
    const trimmedGithub = form.github.trim()
    const trimmedEmail = form.email.trim()

    if (trimmedAvailability.length > AVAILABILITY_MAX_LENGTH) {
      setStatus({ state: 'error', message: `Availability must be ${AVAILABILITY_MAX_LENGTH} characters or fewer` })
      return
    }

    if (trimmedFocusAreas.length > FOCUS_AREAS_MAX_LENGTH) {
      setStatus({ state: 'error', message: `Focus areas must be ${FOCUS_AREAS_MAX_LENGTH} characters or fewer` })
      return
    }

    if (form.highlightsEnabled && trimmedLocation.length === 0) {
      setStatus({ state: 'error', message: 'Location is required when highlights are visible' })
      return
    }

    if (form.highlightsEnabled && trimmedAvailability.length === 0) {
      setStatus({ state: 'error', message: 'Availability is required when highlights are visible' })
      return
    }

    if (form.highlightsEnabled && trimmedFocusAreas.length === 0) {
      setStatus({ state: 'error', message: 'Focus areas are required when highlights are visible' })
      return
    }

    if (form.showLinkedin && trimmedLinkedin.length === 0) {
      setStatus({ state: 'error', message: 'Add a LinkedIn URL or hide the link' })
      return
    }

    if (form.showGithub && trimmedGithub.length === 0) {
      setStatus({ state: 'error', message: 'Add a GitHub URL or hide the link' })
      return
    }

    try {
      await updateProfile({
        name: form.name,
        title: form.title,
        tagline: form.tagline,
        summary: form.summary,
        location: trimmedLocation,
        email: trimmedEmail,
        social: {
          linkedin: trimmedLinkedin,
          github: trimmedGithub,
        },
        contactVisibility: {
          email: form.showEmail,
          linkedin: form.showLinkedin,
          github: form.showGithub,
        },
        highlightsEnabled: form.highlightsEnabled,
        availability: {
          value: trimmedAvailability,
          enabled: form.highlightsEnabled && trimmedAvailability.length > 0,
        },
        focusAreas: {
          value: trimmedFocusAreas,
          enabled: form.highlightsEnabled && trimmedFocusAreas.length > 0,
        },
      })
      setStatus({ state: 'saved' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save profile'
      setStatus({ state: 'error', message })
    }
  }

  const handleExperiencesSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setExperiencesStatus({ state: 'saving' })

    const sanitized = experiencesForm.map((experience) => ({
      role: experience.role.trim(),
      company: experience.company.trim(),
      year: experience.year.trim(),
      description: experience.description.trim(),
      achievements: experience.achievementsInput
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      stack: experience.stackInput
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    }))

    if (sanitized.length === 0) {
      setExperiencesStatus({ state: 'error', message: 'Add at least one experience before saving' })
      return
    }

    const invalidIndex = sanitized.findIndex((experience) => {
      if (!experience.year || !experience.role || !experience.company) {
        return true
      }
      if (!experience.description) {
        return true
      }
      if (experience.stack.length === 0) {
        return true
      }
      return false
    })

    if (invalidIndex !== -1) {
      const displayIndex = invalidIndex + 1
      setExperiencesStatus({
        state: 'error',
        message: `Experience ${displayIndex} needs a year, title, company, description, and at least one skill chip`,
      })
      return
    }

    try {
      const saved = await updateExperiences(sanitized)
      setExperiencesForm(
        saved.map((experience) => ({
          role: experience.role,
          company: experience.company,
          year: experience.year,
          description: experience.description,
          achievementsInput: experience.achievements.join('\n'),
          stackInput: experience.stack.join(', '),
        })),
      )
      setExperiencesStatus({ state: 'saved' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save experiences'
      setExperiencesStatus({ state: 'error', message })
    }
  }

  const handleSiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSiteStatus({ state: 'saving' })
    const trimmedTitle = siteForm.title.trim()
    const trimmedDescription = siteForm.description.trim()
    const sanitizedLogo: SiteLogo | null = siteForm.logo
      ? {
          data: siteForm.logo.data,
          type: siteForm.logo.type,
          ...(siteForm.logo.alt && siteForm.logo.alt.trim().length > 0
            ? { alt: siteForm.logo.alt.trim() }
            : {}),
        }
      : null

    if (!trimmedTitle || !trimmedDescription) {
      setSiteStatus({ state: 'error', message: 'Title and description are required' })
      return
    }

    if (siteForm.homeButtonMode === 'logo' && !sanitizedLogo) {
      setSiteStatus({ state: 'error', message: 'Upload a logo before enabling the logo home button' })
      return
    }

    if (siteForm.homeButtonMode === 'logo' && sanitizedLogo && !sanitizedLogo.alt) {
      setSiteStatus({ state: 'error', message: 'Add alt text so the logo link remains accessible' })
      return
    }

    const payload: SiteMeta = {
      title: trimmedTitle,
      description: trimmedDescription,
      homeButtonMode: siteForm.homeButtonMode === 'logo' && !sanitizedLogo ? 'text' : siteForm.homeButtonMode,
      logo: sanitizedLogo,
    }

    try {
      await updateSite(payload)
      setSiteStatus({ state: 'saved' })
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to save site metadata'
      setSiteStatus({ state: 'error', message })
    }
  }

  const handleSectionsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSectionsStatus({ state: 'saving' })
    const nextSections = {
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
    setSiteStatus({ state: 'resetting' })
    setSectionsStatus({ state: 'resetting' })
    setExperiencesStatus({ state: 'resetting' })
    try {
      await resetContent()
      setStatus({ state: 'reset' })
      setSiteStatus({ state: 'reset' })
      setSectionsStatus({ state: 'reset' })
      setExperiencesStatus({ state: 'reset' })
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Failed to reset content'
      setStatus({ state: 'error', message })
      setSiteStatus({ state: 'error', message })
      setSectionsStatus({ state: 'error', message })
      setExperiencesStatus({ state: 'error', message })
    }
  }

  const profileBusy = loading || status.state === 'saving' || status.state === 'resetting'
  const siteBusy =
    loading || status.state === 'resetting' || sectionsStatus.state === 'resetting' || siteStatus.state === 'saving' || siteStatus.state === 'resetting'
  const sectionsBusy =
    loading || status.state === 'resetting' || sectionsStatus.state === 'saving' || sectionsStatus.state === 'resetting'
  const experiencesBusy =
    loading || status.state === 'resetting' || experiencesStatus.state === 'saving' || experiencesStatus.state === 'resetting'

  const getStatusLabel = (
    currentStatus: ActionStatus,
    scope: 'profile' | 'sections' | 'site' | 'experiences',
  ) => {
    switch (currentStatus.state) {
      case 'saving':
        if (scope === 'profile') return 'Saving profile...'
        if (scope === 'site') return 'Saving site metadata...'
        if (scope === 'experiences') return 'Saving experiences...'
        return 'Saving section copy...'
      case 'saved':
        if (scope === 'profile') return 'Profile updated'
        if (scope === 'site') return 'Site metadata updated'
        if (scope === 'experiences') return 'Experiences updated'
        return 'Section copy updated'
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

  const siteStatusLabel = getStatusLabel(siteStatus, 'site')
  const profileStatusLabel = getStatusLabel(status, 'profile')
  const sectionsStatusLabel = getStatusLabel(sectionsStatus, 'sections')
  const experiencesStatusLabel = getStatusLabel(experiencesStatus, 'experiences')

  const statusMessages = [
    siteStatusLabel && {
      message: siteStatusLabel,
      tone: siteStatus.state === 'error' ? 'error' : 'default',
    },
    profileStatusLabel && {
      message: profileStatusLabel,
      tone: status.state === 'error' ? 'error' : 'default',
    },
    sectionsStatusLabel && {
      message: sectionsStatusLabel,
      tone: sectionsStatus.state === 'error' ? 'error' : 'default',
    },
    experiencesStatusLabel && {
      message: experiencesStatusLabel,
      tone: experiencesStatus.state === 'error' ? 'error' : 'default',
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

        <div className="flex flex-col gap-10 lg:flex-row">
          <nav className="lg:w-60 xl:w-64">
            <div className="sticky top-24 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Navigate</p>
              <ul className="mt-4 space-y-2">
                {sectionNav.map(({ id, label }) => {
                  const isActive = activeSection === id
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? 'bg-accent-500/15 text-accent-200 shadow-glow'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <span>{label}</span>
                        <span
                          className={`h-2 w-2 rounded-full transition ${
                            isActive ? 'bg-accent-400' : 'bg-slate-700/80 group-hover:bg-slate-500'
                          }`}
                          aria-hidden
                        />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          <div className="flex-1 space-y-10">
          <form
            id="site-metadata"
            onSubmit={handleSiteSubmit}
            className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Site metadata</h2>
              <p className="text-sm text-slate-400">
                Control how the site identifies itself in browser tabs and search results. These values
                drive the document title and meta description.
              </p>
            </div>
            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Site title</span>
                <input
                  className={fieldStyle}
                  value={siteForm.title}
                  onChange={handleSiteTextChange('title')}
                  disabled={siteBusy}
                />
                <span className="text-xs text-slate-500">
                  Appears in the browser tab and social previews.
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelStyle}>Meta description</span>
                <textarea
                  className={`${fieldStyle} min-h-[120px]`}
                  value={siteForm.description}
                  onChange={handleSiteTextChange('description')}
                  maxLength={300}
                  disabled={siteBusy}
                />
                <span className="text-xs text-slate-500">
                  Summarize what visitors can expect. Ideal length is under 160 characters.
                </span>
              </label>
              <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/40 p-4">
                <div className="space-y-1">
                  <span className={labelStyle}>Home button</span>
                  <p className="text-xs text-slate-500">
                    Choose how the header links back to the hero section.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                    siteForm.homeButtonMode === 'text'
                      ? 'border-accent-500/50 bg-accent-500/10 text-accent-100'
                      : 'border-slate-800/70 bg-night-900/60 text-slate-300 hover:border-slate-700/60 hover:text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="homeButtonMode"
                        value="text"
                        checked={siteForm.homeButtonMode === 'text'}
                        onChange={handleHomeButtonModeChange}
                        disabled={siteBusy}
                        className="h-4 w-4 rounded-full border-slate-600 bg-night-900 text-accent-500 focus:ring-accent-400"
                      />
                      <span className="font-semibold">Text label</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Uses the site title for the header link.
                    </span>
                  </label>
                  <label className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                    siteForm.homeButtonMode === 'logo'
                      ? 'border-accent-500/50 bg-accent-500/10 text-accent-100'
                      : 'border-slate-800/70 bg-night-900/60 text-slate-300 hover:border-slate-700/60 hover:text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="homeButtonMode"
                        value="logo"
                        checked={siteForm.homeButtonMode === 'logo'}
                        onChange={handleHomeButtonModeChange}
                        disabled={siteBusy || !siteForm.logo}
                        className="h-4 w-4 rounded-full border-slate-600 bg-night-900 text-accent-500 focus:ring-accent-400"
                      />
                      <span className="font-semibold">Logo button</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Displays your uploaded logo instead of text.
                    </span>
                  </label>
                </div>
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-700/60 bg-night-900/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-200">Logo</p>
                      <p className="text-xs text-slate-500">
                        Upload an SVG, PNG, JPG, or WEBP file up to 512KB. Transparent backgrounds work best.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-700/60 bg-night-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-accent-100">
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg,image/webp"
                          onChange={handleLogoUpload}
                          disabled={siteBusy}
                          className="sr-only"
                        />
                        <span>Upload logo</span>
                      </label>
                      {siteForm.logo && (
                        <button
                          type="button"
                          onClick={handleLogoClear}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/60 hover:text-red-200"
                          disabled={siteBusy}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {siteForm.logo ? (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/70 bg-night-900/80">
                          <img
                            src={siteForm.logo.data}
                            alt={siteForm.logo.alt ?? 'Site logo preview'}
                            className="max-h-14 max-w-14 object-contain"
                          />
                        </div>
                        <div className="text-xs text-slate-400">
                          <p className="font-medium text-slate-300">Current logo</p>
                          <p>{siteForm.logo.type.replace('image/', '').toUpperCase()}</p>
                        </div>
                      </div>
                      <label className="flex w-full flex-col gap-2 lg:max-w-xs">
                        <span className={labelStyle}>Logo alt text</span>
                        <input
                          className={fieldStyle}
                          value={siteForm.logo.alt ?? ''}
                          onChange={handleLogoAltChange}
                          placeholder="Describe the logo for screen readers"
                          maxLength={80}
                          disabled={siteBusy}
                        />
                        <span className="text-xs text-slate-500">
                          Required for accessibility when the logo is displayed.
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Upload a logo to unlock the logo home button option.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Updates apply instantly to the live site once saved.
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={siteBusy}
              >
                Save site metadata
              </button>
            </div>
          </form>

          <form onSubmit={handleSubmit} className="grid gap-8">
            <section
              id="profile-identity"
              className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
            >
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
              <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <span className={labelStyle}>Highlight group</span>
                    <p className="text-xs text-slate-500">
                      Control the quick facts (location, availability, focus areas) that appear beside your hero copy.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-700 bg-night-900 text-accent-500 focus:ring-accent-400"
                      checked={form.highlightsEnabled}
                      onChange={handleHighlightsToggle}
                      disabled={profileBusy}
                    />
                    <span>{form.highlightsEnabled ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>
                <div className={`space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 transition ${form.highlightsEnabled ? '' : 'opacity-50'}`}>
                  <label className="flex flex-col gap-2">
                    <span className={labelStyle}>Location</span>
                    <input
                      className={fieldStyle}
                      value={form.location}
                      onChange={handleChange('location')}
                      placeholder="Where you're based"
                      disabled={profileBusy || !form.highlightsEnabled}
                    />
                  </label>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <span className="text-sm font-semibold text-white">Availability</span>
                      <input
                        className={fieldStyle}
                        value={form.availabilityValue}
                        onChange={handleChange('availabilityValue')}
                        maxLength={AVAILABILITY_MAX_LENGTH}
                        placeholder="Availability status"
                        disabled={profileBusy || !form.highlightsEnabled}
                      />
                      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span>Max {AVAILABILITY_MAX_LENGTH} chars</span>
                        <span>{form.availabilityValue.trim().length}/{AVAILABILITY_MAX_LENGTH}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <span className="text-sm font-semibold text-white">Focus areas</span>
                      <input
                        className={fieldStyle}
                        value={form.focusAreasValue}
                        onChange={handleChange('focusAreasValue')}
                        maxLength={FOCUS_AREAS_MAX_LENGTH}
                        placeholder="Key focus areas"
                        disabled={profileBusy || !form.highlightsEnabled}
                      />
                      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span>Max {FOCUS_AREAS_MAX_LENGTH} chars</span>
                        <span>{form.focusAreasValue.trim().length}/{FOCUS_AREAS_MAX_LENGTH}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="profile-narrative"
              className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
            >
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

            <section
              id="profile-contact"
              className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
            >
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-night-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Email</p>
                      <p className="text-xs text-slate-500">Used for direct contact buttons across the site.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-700 bg-night-900 text-accent-500 focus:ring-accent-400"
                        checked={form.showEmail}
                        onChange={handleContactToggle('showEmail')}
                        disabled={profileBusy}
                      />
                      <span>{form.showEmail ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>
                  <input
                    type="email"
                    className={fieldStyle}
                    value={form.email}
                    onChange={handleChange('email')}
                    disabled={profileBusy}
                  />
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-night-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">LinkedIn</p>
                      <p className="text-xs text-slate-500">Appears as a social link when visible.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-700 bg-night-900 text-accent-500 focus:ring-accent-400"
                        checked={form.showLinkedin}
                        onChange={handleContactToggle('showLinkedin')}
                        disabled={profileBusy}
                      />
                      <span>{form.showLinkedin ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>
                  <input
                    className={fieldStyle}
                    value={form.linkedin}
                    onChange={handleChange('linkedin')}
                    disabled={profileBusy || !form.showLinkedin}
                    placeholder="https://www.linkedin.com/in/your-profile"
                  />
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-night-900/60 p-4 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">GitHub</p>
                      <p className="text-xs text-slate-500">Shown wherever your developer presence is highlighted.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-700 bg-night-900 text-accent-500 focus:ring-accent-400"
                        checked={form.showGithub}
                        onChange={handleContactToggle('showGithub')}
                        disabled={profileBusy}
                      />
                      <span>{form.showGithub ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>
                  <input
                    className={fieldStyle}
                    value={form.github}
                    onChange={handleChange('github')}
                    disabled={profileBusy || !form.showGithub}
                    placeholder="https://github.com/your-handle"
                  />
                </div>
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
            onSubmit={handleExperiencesSubmit}
            id="experiences"
            className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Experiences</h2>
              <p className="text-sm text-slate-400">
                Control the experience cards shown on the landing page. Each entry needs a year, title,
                company, description, and the skill chips you want to highlight.
              </p>
            </div>
            <div className="space-y-6">
              {experiencesForm.map((experience, index) => {
                const stackItems = experience.stackInput
                  .split(',')
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0)

                return (
                  <div
                    key={`experience-${index}`}
                    className="space-y-5 rounded-2xl border border-slate-800/70 bg-night-900/50 p-5"
                  >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">Experience {index + 1}</h3>
                      <p className="text-xs text-slate-500">
                        Showcase a role and the stack you led or contributed to during that time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(index)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={experiencesBusy}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className={labelStyle}>Year</span>
                      <input
                        className={fieldStyle}
                        value={experience.year}
                        onChange={handleExperienceTextChange(index, 'year')}
                        placeholder="2023 — Present"
                        disabled={experiencesBusy}
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className={labelStyle}>Title</span>
                      <input
                        className={fieldStyle}
                        value={experience.role}
                        onChange={handleExperienceTextChange(index, 'role')}
                        placeholder="Principal Software Engineer"
                        disabled={experiencesBusy}
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className={labelStyle}>Company</span>
                      <input
                        className={fieldStyle}
                        value={experience.company}
                        onChange={handleExperienceTextChange(index, 'company')}
                        placeholder="Aurora Labs"
                        disabled={experiencesBusy}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className={labelStyle}>Description</span>
                    <textarea
                      className={`${fieldStyle} min-h-[120px]`}
                      value={experience.description}
                      onChange={handleExperienceTextChange(index, 'description')}
                      placeholder="What did you lead or deliver in this role?"
                      disabled={experiencesBusy}
                    />
                  </label>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className={labelStyle}>Achievements</span>
                      <textarea
                        className={`${fieldStyle} min-h-[110px]`}
                        value={experience.achievementsInput}
                        onChange={handleExperienceAchievementsChange(index)}
                        placeholder={`One achievement per line\nScaled platform reliability\nMentored team to ship faster`}
                        disabled={experiencesBusy}
                      />
                      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Appears as bullet points on the landing page
                      </span>
                    </label>
                    <div className="space-y-3">
                      <label className="flex flex-col gap-2">
                        <span className={labelStyle}>Skill chips</span>
                        <input
                          className={fieldStyle}
                          value={experience.stackInput}
                          onChange={handleExperienceStackChange(index)}
                          placeholder="TypeScript, React, Node.js"
                          disabled={experiencesBusy}
                        />
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          Separate items with commas
                        </span>
                      </label>
                      <div className="space-y-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Chip preview
                        </span>
                        <ul className="flex flex-wrap gap-2 text-xs text-slate-300">
                          {stackItems.length > 0 ? (
                            stackItems.map((item) => (
                              <li
                                key={`${item}-${index}`}
                                className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1"
                              >
                                {item}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-slate-500">Add skills to preview chips</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleAddExperience}
                className="inline-flex items-center justify-center rounded-full border border-slate-700/70 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={experiencesBusy}
              >
                Add experience
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={experiencesBusy}
              >
                Save experiences
              </button>
            </div>
          </form>

          <form
            onSubmit={handleSectionsSubmit}
            id="site-sections"
            className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Site sections</h2>
              <p className="text-sm text-slate-400">
                Update the descriptive copy for the Contact section on the landing page.
              </p>
            </div>
            <div className="space-y-6">
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
    </div>
  )
}

export { AdminDashboard }
