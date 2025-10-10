/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

// Provide hoist-safe mocks for db read/write used by repository
const mockStore: Record<string, unknown> = {}
vi.mock('./db.js', () => ({
  readJson: vi.fn(async (key: string) => mockStore[key]),
  writeJson: vi.fn(async (key: string, value: unknown) => { mockStore[key] = value }),
}))

import { savePosts, setPostHidden, removePostById } from './repository.js'

describe('repository extra', () => {
  it('savePosts normalizes posts and generates contentHtml and trims tags', async () => {
    // start with empty posts in store
    mockStore['posts'] = []

    const input = [
      {
        title: '  My Post  ',
        content: 'Hello **world**',
        tags: [' one ', 'two', null],
      },
    ]

    const out = await savePosts(input as any)
    expect(Array.isArray(out)).toBe(true)
    const saved = out[0]
    expect(saved.title).toBe('My Post')
    expect(saved.contentHtml).toContain('<strong>')
    expect(Array.isArray(saved.tags)).toBe(true)
    expect(saved.tags).toContain('one')
    expect(saved.tags).toContain('two')
  })

  it('setPostHidden updates hidden flag for existing post', async () => {
    // seed posts
    mockStore['posts'] = [
      { id: 'p1', title: 'A', content: '', contentHtml: '', tags: [], hidden: false },
      { id: 'p2', title: 'B', content: '', contentHtml: '', tags: [], hidden: false },
    ]

    const res = await setPostHidden('p2', true)
  const found = res.find((p: any) => p.id === 'p2')
  expect(found).toBeDefined()
  expect((found as any).hidden).toBe(true)
  })

  it('removePostById throws when post not found', async () => {
    mockStore['posts'] = [ { id: 'only', title: 'X', content: '', contentHtml: '', tags: [], hidden: false } ]
    await expect(removePostById('missing')).rejects.toThrow()
  })
})
