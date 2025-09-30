import { readJson, writeJson } from './db.js'
import { defaultContent } from './defaultContent.js'
import type {
  ContentState,
  Experience,
  Post,
  Profile,
  ResourceLink,
  SectionsContent,
  SiteLogo,
  SiteMeta,
  Tutorial,
} from './types.js'

const CONTENT_KEYS: (keyof ContentState)[] = [
  'site',
  'profile',
  'experiences',
  'usefulLinks',
  'posts',
  'tutorials',
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
    }
  })
}

const withPostsDefaults = (value: unknown, defaults: Post[]): Post[] => {
  if (!Array.isArray(value)) {
    return defaults.map((item) => ({ ...item }))
  }

  const ensureString = (input: unknown, fallback: string): string => {
    if (typeof input === 'string') {
      const trimmed = input.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
    return fallback
  }

  const ensureStringArray = (input: unknown, fallback: string[]): string[] =>
    Array.isArray(input)
      ? input
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [...fallback]

  const getFallback = (idx: number): Post =>
    defaults[idx] ?? defaults[defaults.length - 1] ?? { title: '', content: '', tags: [] }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const fallback = getFallback(index)
      return { ...fallback }
    }

    const candidate = entry as Partial<Post> & { summary?: unknown; href?: unknown }
    const fallback = getFallback(index)
    const title = ensureString(candidate.title, fallback.title)

    const contentSource = typeof candidate.content === 'string' ? candidate.content : undefined
    const fallbackSummary = typeof candidate.summary === 'string' ? candidate.summary : undefined
    const content = ensureString(contentSource ?? fallbackSummary, fallback.content)

    return {
      title,
      content,
      tags: ensureStringArray(candidate.tags, fallback.tags),
    }
  })
}

const withSectionsDefaults = (value: unknown, defaults: SectionsContent): SectionsContent => {
  const fallbackDescription = defaults.contact.description

  if (!value || typeof value !== 'object') {
    return {
      contact: {
        description: fallbackDescription,
      },
    }
  }

  const candidate = value as Partial<SectionsContent> & {
    about?: { description?: unknown }
  }

  const extractDescription = (source?: { description?: unknown }): string | undefined => {
    if (!source) return undefined
    const raw = source.description
    if (typeof raw !== 'string') return undefined
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  const contactDescription =
    extractDescription(candidate.contact) ?? extractDescription(candidate.about) ?? fallbackDescription

  return {
    contact: {
      description: contactDescription,
    },
  }
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
        case 'usefulLinks':
          content.usefulLinks = value as ContentState['usefulLinks']
          break
        case 'posts':
          content.posts = withPostsDefaults(value, content.posts)
          break
        case 'tutorials':
          content.tutorials = value as ContentState['tutorials']
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

export const saveUsefulLinks = async (links: ResourceLink[]): Promise<ResourceLink[]> => {
  await writeJson('usefulLinks', links)
  return links
}

export const savePosts = async (posts: Post[]): Promise<Post[]> => {
  await writeJson('posts', posts)
  return posts
}

export const saveTutorials = async (tutorials: Tutorial[]): Promise<Tutorial[]> => {
  await writeJson('tutorials', tutorials)
  return tutorials
}

export const saveSections = async (sections: SectionsContent): Promise<SectionsContent> => {
  await writeJson('sections', sections)
  return sections
}

export const resetContent = async (): Promise<ContentState> => {
  for (const key of CONTENT_KEYS) {
    await writeJson(key, defaultContent[key])
  }
  return JSON.parse(JSON.stringify(defaultContent))
}
