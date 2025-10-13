import { randomUUID } from 'node:crypto'
import { readJson, writeJson } from './db.js'
import { defaultContent } from './defaultContent.js'
import { markdownToHtml, parseFrontmatter } from './markdown.js'
import type {
  ContentState,
  Experience,
  Post,
  Profile,
  SectionsContent,
  SiteLogo,
  SiteMeta,
} from './types.js'

import { pool } from './db.js'

const CONTENT_KEYS: (keyof ContentState)[] = [
  'site',
  'profile',
  'experiences',
  'posts',
  'sections',
]

const withSiteDefaults = (value: unknown, defaults: SiteMeta): SiteMeta => {
  const candidate = (value ?? {}) as Partial<SiteMeta>
  const isString = (input: unknown): input is string => typeof input === 'string'

  const rawLogo = candidate.logo
  let normalizedLogo: SiteLogo | null = null

  if (rawLogo && typeof rawLogo === 'object') {
    const logoRecord = rawLogo as Partial<SiteLogo>
    if (isString(logoRecord.data) && isString(logoRecord.type)) {
      normalizedLogo = {
        data: logoRecord.data,
        type: logoRecord.type,
        ...(isString(logoRecord.alt) && logoRecord.alt.trim().length > 0
          ? { alt: logoRecord.alt.trim() }
          : {}),
      }
    }
  }

  return {
    title: isString(candidate.title) ? candidate.title : defaults.title,
    description: isString(candidate.description) ? candidate.description : defaults.description,
    homeButtonMode: candidate.homeButtonMode === 'logo' ? 'logo' : 'text',
    logo: normalizedLogo,
  }
}

const coerceHighlight = (
  input: unknown,
  defaults: Profile['availability'],
  highlightsEnabled: boolean,
): Profile['availability'] => {
  if (!input || typeof input !== 'object') {
    return { ...defaults }
  }

  const candidate = input as Partial<Profile['availability']>
  const value = typeof candidate.value === 'string' ? candidate.value : defaults.value
  const enabledRaw = typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled
  const trimmed = value.trim()

  return {
    value,
    enabled: highlightsEnabled && trimmed.length > 0 ? enabledRaw : false,
  }
}

const withProfileDefaults = (value: unknown, defaults: Profile): Profile => {
  const candidate = (value ?? {}) as Partial<Profile>
  const isString = (input: unknown): input is string => typeof input === 'string'

  const stringOrDefault = (input: unknown, fallback: string): string =>
    isString(input) ? input : fallback

  const socialCandidate = (candidate.social ?? {}) as Partial<Profile['social']>
  const visibilityCandidate = (candidate.contactVisibility ?? {}) as Partial<Profile['contactVisibility']>
  const highlightsEnabled =
    typeof candidate.highlightsEnabled === 'boolean'
      ? candidate.highlightsEnabled
      : defaults.highlightsEnabled

  return {
    name: stringOrDefault(candidate.name, defaults.name),
    title: stringOrDefault(candidate.title, defaults.title),
    tagline: stringOrDefault(candidate.tagline, defaults.tagline),
    summary: stringOrDefault(candidate.summary, defaults.summary),
    location: stringOrDefault(candidate.location, defaults.location).trim(),
    email: stringOrDefault(candidate.email, defaults.email),
    social: {
      linkedin: stringOrDefault(socialCandidate.linkedin, defaults.social.linkedin),
      github: stringOrDefault(socialCandidate.github, defaults.social.github),
    },
    contactVisibility: {
      email:
        typeof visibilityCandidate.email === 'boolean' ? visibilityCandidate.email : defaults.contactVisibility.email,
      linkedin:
        typeof visibilityCandidate.linkedin === 'boolean'
          ? visibilityCandidate.linkedin
          : defaults.contactVisibility.linkedin,
      github:
        typeof visibilityCandidate.github === 'boolean'
          ? visibilityCandidate.github
          : defaults.contactVisibility.github,
    },
    highlightsEnabled,
    availability: coerceHighlight(candidate.availability, defaults.availability, highlightsEnabled),
    focusAreas: coerceHighlight(candidate.focusAreas, defaults.focusAreas, highlightsEnabled),
  }
}

const withExperienceDefaults = (value: unknown, defaults: Experience[]): Experience[] => {
  if (!Array.isArray(value)) {
    return defaults.map((item) => ({ ...item }))
  }

  const ensureString = (input: unknown, fallback: string): string =>
    typeof input === 'string' && input.trim().length > 0 ? input : fallback

  const ensureStringArray = (input: unknown, fallback: string[]): string[] =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [...fallback]

  const getFallback = (idx: number): Experience =>
    defaults[idx] ?? defaults[defaults.length - 1] ?? {
      role: '',
      company: '',
      year: '',
      description: '',
      achievements: [],
      stack: [],
      location: '',
    }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const fallback = getFallback(index)
      return { ...fallback }
    }

    const candidate = entry as Partial<Experience> & { period?: unknown }
    const fallback = getFallback(index)

    return {
      role: ensureString(candidate.role, fallback.role),
      company: ensureString(candidate.company, fallback.company),
      year: ensureString(candidate.year ?? candidate.period, fallback.year),
      description: ensureString(candidate.description, fallback.description),
      achievements: ensureStringArray(candidate.achievements, fallback.achievements),
      stack: ensureStringArray(candidate.stack, fallback.stack),
      location: ensureString(candidate.location, (fallback.location ?? '') as string),
    }
  })
}

const ensureStringArray = (input: unknown, fallback: string[]): string[] =>
  Array.isArray(input)
    ? input
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
    : [...fallback]

const getPostFallback = (defaults: Post[], index: number): Post => {
  const fallback = defaults[index] ?? defaults[defaults.length - 1]
  if (fallback) {
    return { ...fallback }
  }
  return {
    id: randomUUID(),
    title: '',
    content: '',
    contentHtml: '',
    tags: [],
    hidden: false,
  }
}

const ensureBoolean = (input: unknown, fallback: boolean): boolean =>
  typeof input === 'boolean' ? input : fallback

const ensureId = (input: unknown, fallback: string): string => {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return fallback
}

export const normalizePost = (candidate: Partial<Post> & Record<string, unknown>, fallback: Post): Post => {
  const ensureString = (input: unknown, fallbackValue: string): string => {
    if (typeof input === 'string') {
      const trimmed = input.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
    return fallbackValue
  }

  const title = ensureString(candidate.title, fallback.title)

  const contentSource = typeof candidate.content === 'string' ? candidate.content : undefined
  const fallbackSummary = typeof candidate.summary === 'string' ? candidate.summary : undefined
  const content = ensureString(contentSource ?? fallbackSummary, fallback.content)

  // Parse frontmatter from content to extract tags and clean content
  const { frontmatter, content: cleanContent } = parseFrontmatter(content)
  const extractedTags = frontmatter.tags || []

  const extras: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (['id', 'hidden', 'title', 'content', 'contentHtml', 'tags', 'summary', 'href'].includes(key)) continue
    extras[key] = value
  }

  return {
    ...extras,
    id: ensureId(candidate.id, fallback.id),
    title,
    content: content, // Store full content including frontmatter
    tags: ensureStringArray(candidate.tags, extractedTags), // Use extracted tags if no tags provided
    contentHtml: markdownToHtml(cleanContent), // Generate HTML from clean content
    hidden: ensureBoolean(candidate.hidden, fallback.hidden),
  }
}

const withPostsDefaults = (value: unknown, defaults: Post[]): Post[] => {
  if (!Array.isArray(value)) {
    return defaults.map((item) => ({ ...item }))
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const fallback = getPostFallback(defaults, index)
      return { ...fallback }
    }

    const candidate = entry as Partial<Post> & Record<string, unknown>
    const fallback = getPostFallback(defaults, index)
    return normalizePost(candidate, fallback)
  })
}

const withSectionsDefaults = (value: unknown, defaults: SectionsContent): SectionsContent => {
  // If nothing persisted, return defaults (deep copy)
  if (!value || typeof value !== 'object') {
    return JSON.parse(JSON.stringify(defaults)) as SectionsContent
  }

  const candidate = value as Partial<SectionsContent> & Record<string, unknown>

  // Start from defaults and shallow-merge top-level keys from candidate.
  // For contact, prefer candidate.contact.description, or candidate.about.description (legacy),
  // falling back to defaults.contact.description.
  const result: SectionsContent = JSON.parse(JSON.stringify(defaults)) as SectionsContent

  // Preserve/merge any known fields if present on candidate
  if (candidate.contact && typeof candidate.contact === 'object') {
    const c = candidate.contact as { description?: unknown }
    if (typeof c.description === 'string' && c.description.trim().length > 0) {
      result.contact.description = c.description.trim()
    }
  } else if (candidate.about && typeof candidate.about === 'object') {
    // legacy about -> contact.description mapping
    const a = candidate.about as { description?: unknown }
    if (typeof a.description === 'string' && a.description.trim().length > 0) {
      result.contact.description = a.description.trim()
    }
  }

  // For any other keys present on candidate, shallow-copy them into result to preserve
  // user-provided nested blocks (educations, programmingLanguages, languagesSpoken, achievements, etc.)
  for (const [k, v] of Object.entries(candidate)) {
    if (k === 'contact' || k === 'about') continue
    // @ts-expect-error dynamic assignment: we intentionally preserve unknown nested keys
    result[k as keyof SectionsContent] = v as unknown as SectionsContent[keyof SectionsContent]
  }

  return result
}

export const getContent = async (): Promise<ContentState> => {
  const content: ContentState = JSON.parse(JSON.stringify(defaultContent))
  for (const key of CONTENT_KEYS) {
    const value = await readJson<ContentState[typeof key]>(key)
    if (value !== undefined) {
      switch (key) {
        case 'site':
          content.site = withSiteDefaults(value, content.site)
          break
        case 'profile':
          content.profile = withProfileDefaults(value, content.profile)
          break
        case 'experiences':
          content.experiences = withExperienceDefaults(value, content.experiences)
          break
        case 'posts':
          content.posts = withPostsDefaults(value, content.posts)
          break

        case 'sections':
          content.sections = withSectionsDefaults(value, content.sections)
          break
      }
    }
  }
  return content
}

export const saveProfile = async (profile: Profile): Promise<Profile> => {
  await writeJson('profile', profile)
  return profile
}

export const saveSite = async (site: SiteMeta): Promise<SiteMeta> => {
  await writeJson('site', site)
  return site
}

export const saveExperiences = async (experiences: Experience[]): Promise<Experience[]> => {
  await writeJson('experiences', experiences)
  return experiences
}

export const savePosts = async (posts: Array<Partial<Post> & Record<string, unknown>>): Promise<Post[]> => {
  console.debug('savePosts: received', posts.length, 'items')
  const normalized = posts.map((post) => {
    const fallback: Post = {
      id: ensureId(post.id, randomUUID()),
      title: '',
      content: '',
      contentHtml: '',
      tags: [],
      hidden: ensureBoolean(post.hidden, false),
      ...(typeof post.createdAt === 'string' ? { createdAt: post.createdAt } : {}),
      ...(typeof post.updatedAt === 'string' ? { updatedAt: post.updatedAt } : {}),
    }
    try {
      const n = normalizePost({ ...post }, fallback)
      // Avoid logging entire content in development, but provide sizes to help
      if (process.env.NODE_ENV !== 'production') {
        console.debug('savePosts: normalized post', n.id, 'titleLen', n.title.length, 'contentLen', n.content.length)
      }
      return n
    } catch (err) {
      console.error('savePosts: failed to normalize post', err)
      throw err
    }
  })

  try {
    console.debug('savePosts: calling writeJson for posts, count', normalized.length)
    await writeJson('posts', normalized)
    console.debug('savePosts: writeJson succeeded')
  } catch (err) {
    console.error('savePosts: writeJson failed', err)
    throw err
  }

  return normalized
}

const createNotFoundError = (message: string) => {
  const error = new Error(message)
  Object.assign(error, { code: 'POST_NOT_FOUND' as const })
  return error
}

export const removePostById = async (postId: string): Promise<Post[]> => {
  const content = await getContent()
  const exists = content.posts.some((post) => post.id === postId)

  if (!exists) {
    throw createNotFoundError('Post not found')
  }

  const filtered = content.posts.filter((post) => post.id !== postId)
  return savePosts(filtered)
}

export const setPostHidden = async (postId: string, hidden: boolean): Promise<Post[]> => {
  const content = await getContent()
  const exists = content.posts.some((post) => post.id === postId)

  if (!exists) {
    throw createNotFoundError('Post not found')
  }

  const updated = content.posts.map((post) =>
    post.id === postId ? { ...post, hidden } : post,
  )
  return savePosts(updated)
}



export const saveSections = async (sections: SectionsContent): Promise<SectionsContent> => {
  await writeJson('sections', sections)
  return sections
}

export type UploadRecord = {
  id: string
  key: string
  filename: string
  mimetype?: string
  size?: number
  width?: number | null
  height?: number | null
  created_at: string
}

export const saveUpload = async (upload: { key: string; filename: string; mimetype?: string; size?: number; width?: number | null; height?: number | null }) : Promise<UploadRecord> => {
  const result = await pool.query<UploadRecord>(
    `INSERT INTO uploads(key, filename, mimetype, size, width, height) VALUES($1,$2,$3,$4,$5,$6) RETURNING id, key, filename, mimetype, size, width, height, created_at`,
    [upload.key, upload.filename, upload.mimetype ?? null, upload.size ?? null, upload.width ?? null, upload.height ?? null],
  )
  return result.rows[0]
}

export const getUploadById = async (id: string): Promise<UploadRecord | null> => {
  const result = await pool.query<UploadRecord>('SELECT id, key, filename, mimetype, size, width, height, created_at FROM uploads WHERE id = $1', [id])
  if (result.rowCount === 0) return null
  return result.rows[0]
}

export const listUploads = async (limit = 50, offset = 0): Promise<{ rows: UploadRecord[]; total: number }> => {
  const totalRes = await pool.query<{ count: string }>('SELECT COUNT(*)::text as count FROM uploads')
  const total = parseInt(totalRes.rows[0]?.count ?? '0', 10)
  const result = await pool.query<UploadRecord>('SELECT id, key, filename, mimetype, size, width, height, created_at FROM uploads ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset])
  return { rows: result.rows, total }
}

export const deleteUpload = async (id: string): Promise<void> => {
  const result = await pool.query('DELETE FROM uploads WHERE id = $1', [id])
  if (result.rowCount === 0) {
    throw new Error('Upload not found')
  }
}

export const resetContent = async (): Promise<ContentState> => {
  for (const key of CONTENT_KEYS) {
    await writeJson(key, defaultContent[key])
  }
  return JSON.parse(JSON.stringify(defaultContent))
}
