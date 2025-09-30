import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import {
  getContent,
  resetContent,
  saveExperiences,
  savePosts,
  saveProfile,
  saveSections,
  saveSite,
  saveTutorials,
  saveUsefulLinks,
} from './repository.js'
import type {
  Experience,
  Post,
  Profile,
  ResourceLink,
  SectionsContent,
  SiteLogo,
  SiteMeta,
  Tutorial,
} from './types.js'
import './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 4000)
const rawAllowedOrigins = process.env.ALLOWED_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)

const allowedOrigin = rawAllowedOrigins && rawAllowedOrigins.length > 0 ? rawAllowedOrigins : '*'

app.use(express.json())
app.use(
  cors({
    origin: allowedOrigin ?? '*',
  }),
)

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.get('/api/content', async (_req: Request, res: Response) => {
  try {
    const content = await getContent()
    res.json(content)
  } catch (error) {
    console.error('Failed to load content', error)
    res.status(500).json({ message: 'Failed to load content' })
  }
})

const MAX_LOGO_BYTES = 512 * 1024
const allowedLogoTypes = new Set(['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'])

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const sanitizeLogo = (input: unknown): SiteLogo | null => {
  if (input == null) return null
  if (!isObject(input)) {
    throw new Error('Logo payload must be an object')
  }

  const { data, type, alt } = input as {
    data?: unknown
    type?: unknown
    alt?: unknown
  }

  if (typeof data !== 'string' || typeof type !== 'string') {
    throw new Error('Logo requires base64 data and image type')
  }

  if (!allowedLogoTypes.has(type)) {
    throw new Error('Unsupported logo format. Use PNG, SVG, JPEG, or WEBP')
  }

  const expectedPrefix = `data:${type};base64,`
  if (!data.startsWith(expectedPrefix)) {
    throw new Error('Logo data must be a base64 data URL')
  }

  const base64Payload = data.slice(expectedPrefix.length)
  let decodedLength = 0
  try {
    decodedLength = Buffer.from(base64Payload, 'base64').length
  } catch (error) {
    console.error('Failed to decode logo payload', error)
    throw new Error('Logo data must be valid base64')
  }

  if (!Number.isFinite(decodedLength) || Number.isNaN(decodedLength)) {
    throw new Error('Logo data must be valid base64')
  }

  if (decodedLength > MAX_LOGO_BYTES) {
    throw new Error('Logo file is too large. Keep it under 512KB')
  }

  const sanitizedAlt = typeof alt === 'string' ? alt.trim() : undefined

  return {
    data,
    type,
    ...(sanitizedAlt ? { alt: sanitizedAlt } : {}),
  }
}

app.put('/api/site', async (req: Request, res: Response) => {
  const payload = req.body as Partial<SiteMeta> | undefined

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Site metadata is required' })
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const description = typeof payload.description === 'string' ? payload.description.trim() : ''
  const homeButtonMode: SiteMeta['homeButtonMode'] = payload.homeButtonMode === 'logo' ? 'logo' : 'text'

  if (!title || !description) {
    return res.status(422).json({ message: 'Site title and description are required' })
  }

  let logo: SiteLogo | null
  try {
    logo = sanitizeLogo('logo' in payload ? payload.logo : undefined)
  } catch (validationError) {
    const message =
      validationError instanceof Error ? validationError.message : 'Invalid logo provided'
    return res.status(422).json({ message })
  }

  if (homeButtonMode === 'logo' && !logo) {
    return res.status(422).json({ message: 'Provide a logo before enabling the logo home button' })
  }

  const nextSite: SiteMeta = {
    title,
    description,
    homeButtonMode,
    logo,
  }

  try {
    const saved = await saveSite(nextSite)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save site metadata', error)
    res.status(500).json({ message: 'Failed to save site metadata' })
  }
})

const validEmail = (email: string) => /.+@.+\..+/.test(email)
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const validateExperience = (experience: Experience, index: number): string | undefined => {
  if (!isNonEmptyString(experience.role)) return `experiences[${index}].role is required`
  if (!isNonEmptyString(experience.company)) return `experiences[${index}].company is required`
  if (!isNonEmptyString(experience.year)) return `experiences[${index}].year is required`
  if (!isNonEmptyString(experience.description)) return `experiences[${index}].description is required`
  if (!isStringArray(experience.achievements)) return `experiences[${index}].achievements must be an array of strings`
  if (!isStringArray(experience.stack)) return `experiences[${index}].stack must be an array of strings`
  return undefined
}

const validateResourceLink = (link: ResourceLink, index: number): string | undefined => {
  if (!isNonEmptyString(link.label)) return `usefulLinks[${index}].label is required`
  if (!isNonEmptyString(link.href)) return `usefulLinks[${index}].href is required`
  if (!isNonEmptyString(link.description)) return `usefulLinks[${index}].description is required`
  return undefined
}

const validateTutorial = (tutorial: Tutorial, index: number): string | undefined => {
  if (!isNonEmptyString(tutorial.title)) return `tutorials[${index}].title is required`
  if (!isNonEmptyString(tutorial.href)) return `tutorials[${index}].href is required`
  if (!isNonEmptyString(tutorial.duration)) return `tutorials[${index}].duration is required`
  return undefined
}

const validatePost = (post: Post, index: number): string | undefined => {
  if (!isNonEmptyString(post.title)) {
    return `posts[${index}].title is required`
  }

  if (!isNonEmptyString(post.href)) {
    return `posts[${index}].href is required`
  }

  if (!isNonEmptyString(post.summary)) {
    return `posts[${index}].summary is required`
  }

  if (!isStringArray(post.tags)) {
    return `posts[${index}].tags must be an array of strings`
  }

  return undefined
}

const validateSections = (sections: SectionsContent): string | undefined => {
  if (!isNonEmptyString(sections.contact.description)) {
    return 'sections.contact.description is required'
  }

  return undefined
}

app.put('/api/profile', async (req: Request, res: Response) => {
  const payload = req.body as Partial<Profile>
  if (!payload) {
    return res.status(400).json({ message: 'Missing payload' })
  }

  let profile: Profile
  try {
    profile = (await getContent()).profile
  } catch (error) {
    console.error('Failed to load existing profile', error)
    return res.status(500).json({ message: 'Failed to load existing profile' })
  }

  const sanitizeHighlight = (
    incoming: Partial<Profile['availability']> | undefined,
    current: Profile['availability'],
    label: string,
    maxLength: number,
    highlightsEnabled: boolean,
  ) => {
    const rawValue = typeof incoming?.value === 'string' ? incoming.value : current.value
    const trimmedValue = rawValue.trim()
    const fallbackEnabled =
      typeof incoming?.enabled === 'boolean' ? incoming.enabled : current.enabled ?? true

    if (trimmedValue.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or fewer`)
    }

    if (highlightsEnabled && trimmedValue.length === 0) {
      throw new Error(`${label} is required when highlights are visible`)
    }

    return {
      value: trimmedValue,
      enabled: highlightsEnabled && trimmedValue.length > 0 && fallbackEnabled,
    }
  }

  const next: Profile = {
    name: payload.name ?? profile.name,
    title: payload.title ?? profile.title,
    tagline: payload.tagline ?? profile.tagline,
    summary: payload.summary ?? profile.summary,
    location:
      typeof payload.location === 'string' ? payload.location.trim() : profile.location.trim(),
    email: payload.email ?? profile.email,
    social: {
      linkedin:
        typeof payload.social?.linkedin === 'string'
          ? payload.social.linkedin.trim()
          : profile.social.linkedin.trim(),
      github:
        typeof payload.social?.github === 'string'
          ? payload.social.github.trim()
          : profile.social.github.trim(),
    },
    contactVisibility: {
      email:
        typeof payload.contactVisibility?.email === 'boolean'
          ? payload.contactVisibility.email
          : profile.contactVisibility?.email ?? true,
      linkedin:
        typeof payload.contactVisibility?.linkedin === 'boolean'
          ? payload.contactVisibility.linkedin
          : profile.contactVisibility?.linkedin ?? true,
      github:
        typeof payload.contactVisibility?.github === 'boolean'
          ? payload.contactVisibility.github
          : profile.contactVisibility?.github ?? true,
    },
    highlightsEnabled:
      typeof payload.highlightsEnabled === 'boolean'
        ? payload.highlightsEnabled
        : profile.highlightsEnabled ?? true,
    availability: profile.availability,
    focusAreas: profile.focusAreas,
  }

  try {
    if (next.highlightsEnabled && !next.location) {
      throw new Error('Location is required when highlights are visible')
    }
  } catch (validationError) {
    return res.status(422).json({
      message:
        validationError instanceof Error
          ? validationError.message
          : 'Invalid highlight provided',
    })
  }

  try {
    next.availability = sanitizeHighlight(
      payload.availability,
      profile.availability,
      'Availability',
      50,
      next.highlightsEnabled,
    )
    next.focusAreas = sanitizeHighlight(
      payload.focusAreas,
      profile.focusAreas,
      'Focus areas',
      80,
      next.highlightsEnabled,
    )
  } catch (validationError) {
    return res.status(422).json({
      message:
        validationError instanceof Error
          ? validationError.message
          : 'Invalid highlight provided',
    })
  }

  if (!next.name.trim()) {
    return res.status(422).json({ message: 'Name is required' })
  }

  if (!validEmail(next.email)) {
    return res.status(422).json({ message: 'Valid email is required' })
  }

  try {
    const saved = await saveProfile(next)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save profile', error)
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

app.put('/api/posts', async (req: Request, res: Response) => {
  const payload = req.body as Post[]

  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of posts' })
  }

  for (let index = 0; index < payload.length; index += 1) {
    const error = validatePost(payload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await savePosts(payload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save posts', error)
    res.status(500).json({ message: 'Failed to save posts' })
  }
})

app.put('/api/sections', async (req: Request, res: Response) => {
  const payload = req.body as Partial<SectionsContent> | undefined

  let currentSections: SectionsContent
  try {
    currentSections = (await getContent()).sections
  } catch (error) {
    console.error('Failed to load existing sections', error)
    return res.status(500).json({ message: 'Failed to load existing sections' })
  }

  const next: SectionsContent = {
    contact: {
      description:
        typeof payload?.contact?.description === 'string'
          ? payload.contact.description
          : currentSections.contact.description,
    },
  }

  const errorMessage = validateSections(next)
  if (errorMessage) {
    return res.status(422).json({ message: errorMessage })
  }

  try {
    const saved = await saveSections(next)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save sections', error)
    res.status(500).json({ message: 'Failed to save sections' })
  }
})

app.put('/api/experiences', async (req: Request, res: Response) => {
  const payload = req.body as Experience[]
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of experiences' })
  }

  for (let index = 0; index < payload.length; index += 1) {
    const error = validateExperience(payload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await saveExperiences(payload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save experiences', error)
    res.status(500).json({ message: 'Failed to save experiences' })
  }
})

app.put('/api/useful-links', async (req: Request, res: Response) => {
  const payload = req.body as ResourceLink[]
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of links' })
  }

  for (let index = 0; index < payload.length; index += 1) {
    const error = validateResourceLink(payload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await saveUsefulLinks(payload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save useful links', error)
    res.status(500).json({ message: 'Failed to save useful links' })
  }
})

app.put('/api/tutorials', async (req: Request, res: Response) => {
  const payload = req.body as Tutorial[]
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of tutorials' })
  }

  for (let index = 0; index < payload.length; index += 1) {
    const error = validateTutorial(payload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await saveTutorials(payload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save tutorials', error)
    res.status(500).json({ message: 'Failed to save tutorials' })
  }
})

app.post('/api/reset', async (_req: Request, res: Response) => {
  try {
    const content = await resetContent()
    res.json(content)
  } catch (error) {
    console.error('Failed to reset content', error)
    res.status(500).json({ message: 'Failed to reset content' })
  }
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' })
})

app.listen(port, () => {
  console.log(`API server listening on port ${port}`)
})
