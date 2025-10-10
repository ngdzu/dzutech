/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

describe('getContent merges persisted values with defaults', () => {
  it('applies site defaults and normalizes logo', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'site') return { title: ' My Site ', description: 'Desc', homeButtonMode: 'logo', logo: { data: 'd', type: 'image/png', alt: ' alt ' } }
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(content.site.title).toBe(' My Site ')
    expect(content.site.homeButtonMode).toBe('logo')
    expect(content.site.logo).toEqual({ data: 'd', type: 'image/png', alt: 'alt' })
  })

  it('coerces profile highlights and availability', async () =>
  {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'profile') return {
        name: ' Tester ',
        highlightsEnabled: false,
        availability: { value: ' available ', enabled: true },
        focusAreas: { value: ' focus ', enabled: true },
      }
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(content.profile.name).toBe(' Tester ')
    // highlightsEnabled false should disable availability.enabled even if candidate enabled true
    expect(content.profile.availability.enabled).toBe(false)
    expect(content.profile.focusAreas.enabled).toBe(false)
  })

  it('normalizes experiences array with fallbacks', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'experiences') return [null, { role: ' Dev ', company: null, achievements: [' a ', 2] }]
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(Array.isArray(content.experiences)).toBe(true)
    // the implementation preserves the original string (does not trim here)
    expect(content.experiences[1].role).toBe(' Dev ')
    expect(Array.isArray(content.experiences[1].achievements)).toBe(true)
  })

  it('withPostsDefaults falls back when posts is not an array', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'posts') return { not: 'an array' }
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(Array.isArray(content.posts)).toBe(true)
    // should be populated from defaults (at least one post)
    expect(content.posts.length).toBeGreaterThan(0)
  })

  it('withPostsDefaults handles non-object entries by using fallbacks', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'posts') return [null, 123, { title: 'ok' }]
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(Array.isArray(content.posts)).toBe(true)
    // entries created for the non-object posts should have ids
    expect(typeof content.posts[0].id).toBe('string')
    expect(typeof content.posts[1].id).toBe('string')
  })

  it('parses posts and preserves extras and summary fallback', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'posts') return [{ id: '  p1 ', title: ' T ', summary: 'S', extra: 123 }]
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(content.posts[0].id).toBe('p1')
    expect(content.posts[0].title).toBe('T')
    expect(content.posts[0].content).toBe('S')
    // extras should include the 'extra' field
    expect((content.posts[0] as any).extra).toBe(123)
  })

  it('merges sections contact.about into contact.description and preserves extra keys', async () => {
    vi.resetModules()
    const readJson = async (key: string) => {
      if (key === 'sections') return { about: { description: ' legacy ' }, educations: [{ school: 'X' }] }
      return undefined
    }
    await vi.doMock('./db.js', async () => ({ readJson }))
    const repo = await import('./repository.js')
    const content = await repo.getContent()
    expect(content.sections.contact.description).toBe('legacy')
    // preserved custom keys
  expect((content.sections as any).educations).toBeDefined()
  })
})
