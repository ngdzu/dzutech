import type { Experience, Post, SectionsContent, SiteLogo } from './types.js'

export const MAX_LOGO_BYTES = 512 * 1024
export const allowedLogoTypes = new Set(['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'])

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const sanitizeLogo = (input: unknown): SiteLogo | null => {
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

export const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

export const validateExperience = (experience: Experience, index: number): string | undefined => {
  if (!isNonEmptyString(experience.role)) return `experiences[${index}].role is required`
  if (!isNonEmptyString(experience.company)) return `experiences[${index}].company is required`
  if (!isNonEmptyString(experience.year)) return `experiences[${index}].year is required`
  if (!isNonEmptyString(experience.description)) return `experiences[${index}].description is required`
  if (!isStringArray(experience.achievements)) return `experiences[${index}].achievements must be an array of strings`
  if (!isStringArray(experience.stack)) return `experiences[${index}].stack must be an array of strings`
  return undefined
}

export const validatePost = (post: Partial<Post> & Record<string, unknown>, index: number): string | undefined => {
  if ('id' in post && typeof post.id !== 'string') {
    return `posts[${index}].id must be a string`
  }

  if ('hidden' in post && typeof post.hidden !== 'boolean') {
    return `posts[${index}].hidden must be a boolean`
  }

  if (!isNonEmptyString(post.title)) {
    return `posts[${index}].title is required`
  }

  if (!isNonEmptyString(post.content)) {
    return `posts[${index}].content is required`
  }

  if (!isStringArray(post.tags)) {
    return `posts[${index}].tags must be an array of strings`
  }

  return undefined
}

export const validateSections = (sections: SectionsContent): string | undefined => {
  if (!isNonEmptyString(sections.contact.description)) {
    return 'sections.contact.description is required'
  }

  return undefined
}
