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
import type { Experience, Post, Profile, ResourceLink, SectionsContent, Tutorial } from './types.js'
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

app.put('/api/site', async (req: Request, res: Response) => {
  const payload = req.body as Partial<{ title: string; description: string }> | undefined

  if (!payload || (typeof payload.title !== 'string' && typeof payload.description !== 'string')) {
    return res.status(400).json({ message: 'Site metadata is required' })
  }

  const nextSite = {
    title: typeof payload.title === 'string' ? payload.title.trim() : undefined,
    description: typeof payload.description === 'string' ? payload.description.trim() : undefined,
  }

  if (!nextSite.title || !nextSite.description) {
    return res.status(422).json({ message: 'Site title and description are required' })
  }

  try {
    const saved = await saveSite({ title: nextSite.title, description: nextSite.description })
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
  if (!isNonEmptyString(experience.period)) return `experiences[${index}].period is required`
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
  if (!isNonEmptyString(sections.about.description)) {
    return 'sections.about.description is required'
  }

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

  const next: Profile = {
    name: payload.name ?? profile.name,
    title: payload.title ?? profile.title,
    tagline: payload.tagline ?? profile.tagline,
    summary: payload.summary ?? profile.summary,
    location: payload.location ?? profile.location,
    email: payload.email ?? profile.email,
    social: {
      linkedin: payload.social?.linkedin ?? profile.social.linkedin,
      github: payload.social?.github ?? profile.social.github,
      x: payload.social?.x ?? profile.social.x,
    },
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
    about: {
      description:
        typeof payload?.about?.description === 'string'
          ? payload.about.description
          : currentSections.about.description,
    },
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
