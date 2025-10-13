import { describe, it, expect } from 'vitest'
import {
  allowedLogoTypes,
  MAX_LOGO_BYTES,
  sanitizeLogo,
  isNonEmptyString,
  isStringArray,
  validateExperience,
  validatePost,
  validateSections,
} from './validators'

describe('sanitizeLogo', () => {
  it('returns null for null/undefined input', () => {
    expect(sanitizeLogo(null)).toBeNull()
    expect(sanitizeLogo(undefined)).toBeNull()
  })

  it('throws when input is not an object', () => {
    // string is invalid
    expect(() => sanitizeLogo('string' as unknown)).toThrow('Logo payload must be an object')
  })

  it('throws when missing data or type', () => {
    expect(() => sanitizeLogo({})).toThrow('Logo requires base64 data and image type')
    expect(() => sanitizeLogo({ data: 'foo' })).toThrow('Logo requires base64 data and image type')
  })

  it('throws for unsupported types', () => {
    const bad = { data: 'data:application/pdf;base64,AAA', type: 'application/pdf' }
    expect(() => sanitizeLogo(bad)).toThrow('Unsupported logo format')
  })

  it('throws when data URL prefix does not match type', () => {
    const type = Array.from(allowedLogoTypes)[0]
    // data is not a data URL
    expect(() => sanitizeLogo({ data: 'not-a-data-url', type })).toThrow('Logo data must be a base64 data URL')
  })

  it('throws when decoded size exceeds MAX_LOGO_BYTES', () => {
    const type = 'image/png'
    const buf = Buffer.alloc(MAX_LOGO_BYTES + 10, 0)
    const base64 = buf.toString('base64')
    const data = `data:${type};base64,${base64}`
    expect(() => sanitizeLogo({ data, type })).toThrow('Logo file is too large')
  })

  it('handles invalid-looking base64 by attempting decode (does not necessarily throw)', () => {
    const type = 'image/png'
    const data = `data:${type};base64,not_base64!!!`
    const res = sanitizeLogo({ data, type })
    expect(res).not.toBeNull()
    expect(res).toHaveProperty('data', data)
    expect(res).toHaveProperty('type', type)
  })

  it('returns sanitized object for valid payload and trims alt', () => {
    const type = 'image/png'
    const payload = Buffer.from('hello').toString('base64')
    const data = `data:${type};base64,${payload}`
    const out = sanitizeLogo({ data, type, alt: '  alt text  ' })
    expect(out).toEqual({ data, type, alt: 'alt text' })
  })
})

describe('string helpers', () => {
  it('isNonEmptyString works', () => {
    expect(isNonEmptyString(' a ')).toBe(true)
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
  })

  it('isStringArray works', () => {
    expect(isStringArray(['a', 'b'])).toBe(true)
    expect(isStringArray(['a', 1 as unknown as string])).toBe(false)
    expect(isStringArray('not-array' as unknown as string[])).toBe(false)
  })
})

describe('validateExperience', () => {
  const good = {
    role: 'dev',
    company: 'co',
    year: '2020',
    description: 'd',
    achievements: ['a'],
    stack: ['js'],
  }

  it('accepts a valid experience', () => {
    expect(validateExperience(good, 0)).toBeUndefined()
  })

  it('rejects missing role', () => {
    const e = { ...good, role: '  ' }
    expect(validateExperience(e, 1)).toBe('experiences[1].role is required')
  })

  it('rejects non-string arrays for achievements', () => {
    const e1 = { ...good, achievements: ['a', 1 as unknown as string] }
    expect(validateExperience(e1, 2)).toBe('experiences[2].achievements must be an array of strings')
  })
})

describe('validatePost', () => {
  const base = { title: 't', content: 'c', tags: ['x'] }

  it('accepts a valid post', () => {
    expect(validatePost({ ...base }, 0)).toBeUndefined()
  })

  it('rejects non-string id', () => {
    expect(validatePost({ ...base, id: 1 as unknown as string }, 0)).toBe('posts[0].id must be a string')
  })

  it('rejects non-boolean hidden', () => {
    expect(validatePost({ ...base, hidden: 'no' as unknown as boolean }, 0)).toBe('posts[0].hidden must be a boolean')
  })

  it('rejects missing title/content/tags', () => {
    expect(validatePost({ ...base, title: ' ' }, 3)).toBe('posts[3].title is required')
    expect(validatePost({ ...base, content: '' }, 4)).toBe('posts[4].content is required')
    expect(validatePost({ ...base, tags: 'tag' as unknown as string[] }, 5)).toBe('posts[5].tags must be an array of strings')
  })
})

import type { SectionsContent } from './types'

describe('validateSections', () => {
  it('rejects missing contact description', () => {
    expect(validateSections({ contact: { description: '' } } as unknown as SectionsContent)).toBe('sections.contact.description is required')
  })
})
