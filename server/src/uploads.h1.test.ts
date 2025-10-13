import { beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import type { Express } from 'express'

// Helper to import fresh app with provided mocks
async function importAppWithMocks(mocks: Record<string, unknown>): Promise<Express> {
  vi.resetModules()
  for (const [modPath, impl] of Object.entries(mocks)) {
    // @ts-expect-error - vi.doMock typing is loose in tests
    vi.doMock(modPath, () => impl)
  }
  const mod = await import('./index.js')
  return (mod as unknown as { app: Express }).app
}

describe('MD upload H1 validation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('accepts a markdown file with top-level H1 and sets title from it', async () => {
    const goodMd = `---\ntags: "one"\n---\n# My Great Post\n\nContent here.`

  const savePosts = vi.fn(async (posts: unknown[]) => posts)
    const getContent = vi.fn(async () => ({ posts: [] }))

    const app = await importAppWithMocks({
      './requireAuth.js': { requireAuth: (_req: unknown, _res: unknown, next: () => void) => next() },
      './repository.js': { savePosts, getContent },
    })

    const res = await supertest(app)
      .post('/api/admin/posts/upload')
      .attach('files', Buffer.from(goodMd), 'good.md')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('saved')
    expect(Array.isArray(res.body.saved)).toBe(true)
    expect(res.body.saved[0].title).toBe('My Great Post')
    expect(savePosts).toHaveBeenCalled()
  })

  it('rejects a markdown file missing top-level H1 and returns per-file error', async () => {
    const badMd = `---\ntags: "x"\n---\nIntro without H1\n\n# Later H2` 

  const savePosts = vi.fn(async (posts: unknown[]) => posts)
    const getContent = vi.fn(async () => ({ posts: [] }))

    const app = await importAppWithMocks({
      './requireAuth.js': { requireAuth: (_req: unknown, _res: unknown, next: () => void) => next() },
      './repository.js': { savePosts, getContent },
    })

    const res = await supertest(app)
      .post('/api/admin/posts/upload')
      .attach('files', Buffer.from(badMd), 'bad.md')

    expect(res.status).toBe(422)
    expect(res.body).toHaveProperty('errors')
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.join(' ')).toContain("Missing top-level H1 title")
    expect(savePosts).not.toHaveBeenCalled()
  })

  it('rejects the entire batch when one of multiple files is invalid', async () => {
    const goodMd = `# Valid Title\n\nContent` // no frontmatter but valid H1
    const badMd = `Intro without H1\n\n# Later` // invalid because first non-empty line is not H1

  const savePosts = vi.fn(async (posts: unknown[]) => posts)
    const getContent = vi.fn(async () => ({ posts: [] }))

    const app = await importAppWithMocks({
      './requireAuth.js': { requireAuth: (_req: unknown, _res: unknown, next: () => void) => next() },
      './repository.js': { savePosts, getContent },
    })

    const res = await supertest(app)
      .post('/api/admin/posts/upload')
      .attach('files', Buffer.from(goodMd), 'one.md')
      .attach('files', Buffer.from(badMd), 'two.md')

    expect(res.status).toBe(422)
    expect(res.body).toHaveProperty('errors')
  expect(Array.isArray(res.body.errors) && (res.body.errors as unknown[]).some((e: unknown) => typeof e === 'string' && e.includes('two.md'))).toBe(true)
    expect(savePosts).not.toHaveBeenCalled()
  })
})
