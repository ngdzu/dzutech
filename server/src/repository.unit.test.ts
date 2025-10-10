/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

describe('repository exports (db interactions and content helpers)', () => {
  it('saveUpload, getUploadById and listUploads work with pool.query', async () => {
    vi.resetModules()
    const record = { id: 'u1', key: 'uploads/f.png', filename: 'f.png', mimetype: 'image/png', size: 123, width: null, height: null, created_at: new Date().toISOString() }

    const pool = {
      query: async (sql: string, _params?: any[]) => {
        void _params
        if (sql.includes('INSERT INTO uploads')) {
          return { rows: [record] }
        }
        if (sql.includes('SELECT COUNT')) {
          return { rows: [{ count: '1' }] }
        }
        if (sql.includes('FROM uploads WHERE id = $1')) {
          return { rowCount: 1, rows: [record] }
        }
        // list query
        return { rows: [record] }
      },
    }

    await vi.doMock('./db.js', async () => ({ pool }))
    const repo = await import('./repository.js')

    const saved = await repo.saveUpload({ key: record.key, filename: record.filename, mimetype: record.mimetype, size: record.size })
    expect(saved).toEqual(record)

    const byId = await repo.getUploadById('u1')
    expect(byId).toEqual(record)

    const list = await repo.listUploads(10, 0)
    expect(list.total).toBe(1)
    expect(list.rows[0]).toEqual(record)
  })

  it('getUploadById returns null when not found', async () => {
    vi.resetModules()
    const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
    await vi.doMock('./db.js', async () => ({ pool }))
    const repo = await import('./repository.js')
    const r = await repo.getUploadById('does-not-exist')
    expect(r).toBeNull()
  })

  it('saveProfile/saveSite/saveExperiences/saveSections call writeJson and return value', async () => {
    vi.resetModules()
    const writes: Array<{ key: string; value: any }> = []
    const writeJson = async (key: string, value: any) => { writes.push({ key, value }) }
    const readJson = async () => undefined
    await vi.doMock('./db.js', async () => ({ writeJson, readJson }))
    const repo = await import('./repository.js')

    const prof = { name: 'X' } as any
    const outP = await repo.saveProfile(prof)
    expect(outP).toBe(prof)

    const site = { title: 'T' } as any
    const outS = await repo.saveSite(site)
    expect(outS).toBe(site)

    const exp = [{ role: 'r' }]
    const outE = await repo.saveExperiences(exp as any)
    expect(outE).toEqual(exp)

    const sections = { contact: { description: 'hi' } } as any
    const outSec = await repo.saveSections(sections)
    expect(outSec).toBe(sections)

    // ensure writeJson called for those keys
    const keys = writes.map((w) => w.key)
    expect(keys).toEqual(expect.arrayContaining(['profile', 'site', 'experiences', 'sections']))
  })

  it('savePosts normalizes posts and returns normalized array', async () => {
    vi.resetModules()
    const writes: any[] = []
    const writeJson = async (key: string, value: any) => { writes.push({ key, value }) }
    await vi.doMock('./db.js', async () => ({ writeJson }))
    const repo = await import('./repository.js')

    const postsIn = [ { id: '  id1  ', title: '  t  ', content: '  c  ', tags: [' a ', null], hidden: true } ]
    const out = await repo.savePosts(postsIn as any)
    expect(Array.isArray(out)).toBe(true)
    expect(out[0].id).toBe('id1')
    expect(out[0].title).toBe('t')
    expect(out[0].content).toBe('c')
    expect(out[0].tags).toContain('a')
    // writeJson should have been called for posts
    expect(writes.some((w) => w.key === 'posts')).toBe(true)
  })

  it('removePostById throws when not found and removes when present', async () => {
    vi.resetModules()
    // need to mock readJson and writeJson; readJson will return posts array when key === 'posts'
    const stored: Record<string, any> = {}
    const readJson = async (key: string) => {
      if (key === 'posts') return stored.posts
      return undefined
    }
    const writes: any[] = []
    const writeJson = async (key: string, value: any) => { stored[key] = value; writes.push({ key, value }) }
    await vi.doMock('./db.js', async () => ({ readJson, writeJson }))
    const repo = await import('./repository.js')

    // no posts initially
    await expect(repo.removePostById('nope')).rejects.toMatchObject({ code: 'POST_NOT_FOUND' })

    // add a post and remove it
    stored.posts = [{ id: 'p1', title: 't', content: 'c', contentHtml: '', tags: [], hidden: false }]
    const result = await repo.removePostById('p1')
    expect(Array.isArray(result)).toBe(true)
    // after removal posts should be written (savePosts->writeJson)
    expect(writes.some((w) => w.key === 'posts')).toBe(true)
  })

  it('setPostHidden throws when not found and updates when present', async () => {
    vi.resetModules()
    const stored: Record<string, any> = {}
    const readJson = async (key: string) => { if (key === 'posts') return stored.posts; return undefined }
    const writes: any[] = []
    const writeJson = async (key: string, value: any) => { stored[key] = value; writes.push({ key, value }) }
    await vi.doMock('./db.js', async () => ({ readJson, writeJson }))
    const repo = await import('./repository.js')

    await expect(repo.setPostHidden('nope', true)).rejects.toMatchObject({ code: 'POST_NOT_FOUND' })

    stored.posts = [{ id: 'p2', title: 't', content: 'c', contentHtml: '', tags: [], hidden: false }]
    const updated = await repo.setPostHidden('p2', true)
  const found = updated.find((p: any) => p.id === 'p2')
  expect(found).toBeDefined()
  expect(found!.hidden).toBe(true)
    expect(writes.some((w) => w.key === 'posts')).toBe(true)
  })

  it('resetContent writes defaults for all keys', async () => {
    vi.resetModules()
    const writes: any[] = []
  const writeJson = async (key: string, _value: any) => { void _value; writes.push(key) }
    await vi.doMock('./db.js', async () => ({ writeJson }))
    const repo = await import('./repository.js')

    const res = await repo.resetContent()
    // should return an object containing site/profile/posts etc
    expect(res).toHaveProperty('site')
    // ensure writeJson was called for each CONTENT_KEYS (site, profile, experiences, posts, sections)
    expect(writes).toEqual(expect.arrayContaining(['site', 'profile', 'experiences', 'posts', 'sections']))
  })
})
