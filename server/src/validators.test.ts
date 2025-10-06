import { describe, it, expect } from 'vitest'
import { sanitizeLogo, isStringArray, validateExperience, validatePost, validateSections } from './validators.js'

describe('validators', () => {
  it('sanitizeLogo accepts valid base64 data URL', () => {
    const data = 'data:image/png;base64,' + Buffer.from('abc').toString('base64')
    const result = sanitizeLogo({ data, type: 'image/png', alt: 'Alt' })
    expect(result).toBeTruthy()
    expect(result?.type).toBe('image/png')
  })

  it('sanitizeLogo rejects invalid payloads', () => {
    expect(() => sanitizeLogo('not-an-object' as unknown)).toThrow()
    expect(() => sanitizeLogo({ data: 'notbase64', type: 'image/png' })).toThrow()
  })

  it('isStringArray', () => {
    expect(isStringArray(['a', 'b'])).toBe(true)
    expect(isStringArray([1, 2] as unknown)).toBe(false)
  })

  it('validateExperience returns messages for missing fields', () => {
    const fixture: import('./types.js').Experience = {
      role: '',
      company: '',
      year: '',
      description: '',
      achievements: [],
      stack: [],
    }
    const msg = validateExperience(fixture, 0)
    expect(msg).toBeDefined()
  })

  it('validatePost validates fields', () => {
    const fixture: Partial<import('./types.js').Post> & Record<string, unknown> = {
      title: '',
      content: '',
      tags: [],
    }
    const bad = validatePost(fixture, 0)
    expect(bad).toBeDefined()
  })

  it('validateSections returns message when contact.description missing', () => {
    const fixture: import('./types.js').SectionsContent = { contact: { description: '' } }
    const msg = validateSections(fixture)
    expect(msg).toBeDefined()
  })
})
