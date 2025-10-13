/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest'
import { describe, it, expect, beforeAll, vi } from 'vitest'

// Hoist-safe mocks
vi.mock('connect-pg-simple', () => ({ default: (session: any) => {
  const Base = (session && session.Store) ? session.Store : class {}
  class MockStore extends Base {
    sessions: Map<string, any>
    constructor(...args: any[]) { super(...args); this.sessions = new Map() }
    on() {}
    get(sid: string, cb: (err: unknown, sess?: unknown) => void) { if (typeof cb === 'function') cb(null, this.sessions.get(sid) ?? null) }
    set(sid: string, sess: unknown, cb: (err?: unknown) => void) { try { this.sessions.set(sid, sess); if (typeof cb === 'function') cb(); } catch (e) { if (typeof cb === 'function') cb(e) } }
    destroy(sid: string, cb: (err?: unknown) => void) { this.sessions.delete(sid); if (typeof cb === 'function') cb() }
  }
  return MockStore
} }))

vi.mock('./db.js', () => ({ pool: {} }))

// repository functions are mocked with vi.fn so tests can override behavior per-case
vi.mock('./repository.js', () => {
  return {
    getContent: vi.fn(async () => ({ posts: [], profile: { name: 'X', title: '', tagline: '', summary: '', location: 'L', email: 'a@b.com', social: { linkedin: '', github: '' }, contactVisibility: {}, highlightsEnabled: false, availability: { value: '', enabled: true }, focusAreas: { value: '', enabled: true }, focusAreas2: undefined }, sections: { contact: { description: '' }, experiencesPage: { visible: true }, educations: { visible: true, items: [] }, programmingLanguages: { visible: true, items: [] }, languagesSpoken: { visible: true, items: [] }, achievements: { visible: true, items: [] } }, experiences: [], site: {} })),
    resetContent: vi.fn(async () => ({})),
    saveExperiences: vi.fn(async () => []),
    savePosts: vi.fn(async () => []),
    saveProfile: vi.fn(async (p: unknown) => p),
    saveSections: vi.fn(async (s: unknown) => s),
    removePostById: vi.fn(async () => []),
    setPostHidden: vi.fn(async () => []),
  }
})

vi.mock('bcryptjs', () => ({ default: { compare: async () => true } }))

// requireAuth should allow requests in these tests (attach a user)
vi.mock('./requireAuth.js', () => ({ requireAuth: (req: any, _res: any, next: any) => { req.session = req.session || {}; req.session.user = { email: process.env.ADMIN_EMAIL }; next() } }))

beforeAll(async () => {
  // Set environment variables before importing the module
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret'
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.com'
  process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$test.hash.for.admin.password'
  process.env.SESSION_NAME = process.env.SESSION_NAME || 'test-session'
  process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS || '24'
  process.env.NODE_ENV = process.env.NODE_ENV || 'test'
  process.env.PORT = process.env.PORT || '3000'

  // import index to start the server. Mocks are already hoisted.
  const mod = await import('./index.js');
  // Use the exported app instance so supertest doesn't need a real network listener
  (globalThis as any).serverApp = (mod as any).app;
})

describe('index API routes (smoke/branch coverage)', () => {
  it('GET /api/health', async () => {
  const res = await request((globalThis as any).serverApp).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })

  it('GET /api/content success and failure', async () => {
  const repo = await import('./repository.js')
  const repoAny: any = repo
  // success
  repoAny.getContent.mockImplementationOnce(async () => ({ posts: [], profile: {}, sections: {}, experiences: [], site: {} }))
  let res = await request((globalThis as any).serverApp).get('/api/content')
    expect(res.status).toBe(200)

    // failure
  repoAny.getContent.mockImplementationOnce(async () => { throw new Error('boom') })
  res = await request((globalThis as any).serverApp).get('/api/content')
    expect(res.status).toBe(500)
  })

  it('POST /api/auth/login cases', async () => {
    // missing body
  let res = await request((globalThis as any).serverApp).post('/api/auth/login')
    expect(res.status).toBe(400)

    // wrong email
  res = await request((globalThis as any).serverApp).post('/api/auth/login').send({ email: 'bad@example.com', password: 'x' })
    expect(res.status).toBe(401)

    // correct email, bcrypt mocked true -> success
  res = await request((globalThis as any).serverApp).post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: 'x' })
    expect(res.status).toBe(200)
  })

  it('DELETE /api/posts/:postId missing and not found', async () => {
  const repo = await import('./repository.js')
  const repoAny: any = repo
    // missing (blank after trim)
  let res = await request((globalThis as any).serverApp).delete('/api/posts/%20')
    expect(res.status).toBe(400)

    // not found
  repoAny.removePostById.mockImplementationOnce(async () => { const e: any = new Error('not'); e.code = 'POST_NOT_FOUND'; throw e })
  res = await request((globalThis as any).serverApp).delete('/api/posts/doesnotexist')
    expect(res.status).toBe(404)
  })

  it('PATCH /api/posts/:postId/visibility validation and not found', async () => {
  const repo = await import('./repository.js')
  const repoAny: any = repo
    // missing post id
  let res = await request((globalThis as any).serverApp).patch('/api/posts/%20/visibility').send({ hidden: true })
    expect(res.status).toBe(400)

    // invalid hidden body
  res = await request((globalThis as any).serverApp).patch('/api/posts/1/visibility').send({ hidden: 'yes' })
    expect(res.status).toBe(400)

    // not found
  repoAny.setPostHidden.mockImplementationOnce(async () => { const e: any = new Error('no'); e.code = 'POST_NOT_FOUND'; throw e })
  res = await request((globalThis as any).serverApp).patch('/api/posts/1/visibility').send({ hidden: true })
    expect(res.status).toBe(404)
  })

  it('POST /api/reset success and failure', async () => {
  const repo = await import('./repository.js')
  const repoAny: any = repo
  repoAny.resetContent.mockImplementationOnce(async () => ({ reset: true }))
  let res = await request((globalThis as any).serverApp).post('/api/reset')
    expect(res.status).toBe(200)

  repoAny.resetContent.mockImplementationOnce(async () => { throw new Error('boom') })
  res = await request((globalThis as any).serverApp).post('/api/reset')
    expect(res.status).toBe(500)
  })

  it('PUT /api/profile validation and save paths', async () => {
    const repo = await import('./repository.js')
    const repoAny: any = repo

  // missing payload (empty body) - server treats as empty object and continues
  let res = await request((globalThis as any).serverApp).put('/api/profile')
  expect(res.status).toBe(200)

    // highlights enabled but missing location
    repoAny.getContent.mockImplementationOnce(async () => ({ profile: { name: 'A', title: '', tagline: '', summary: '', location: '', email: 'a@b.com', social: { linkedin: '', github: '' }, contactVisibility: {}, highlightsEnabled: false, availability: { value: '', enabled: true }, focusAreas: { value: '', enabled: true } }, posts: [], sections: {}, experiences: [], site: {} }))
    res = await request((globalThis as any).serverApp).put('/api/profile').send({ highlightsEnabled: true })
    expect(res.status).toBe(422)

    // sanitizeHighlight length too long
    const long = 'x'.repeat(60)
    repoAny.getContent.mockImplementationOnce(async () => ({ profile: { name: 'A', title: '', tagline: '', summary: '', location: 'L', email: 'a@b.com', social: { linkedin: '', github: '' }, contactVisibility: {}, highlightsEnabled: false, availability: { value: '', enabled: true }, focusAreas: { value: '', enabled: true } }, posts: [], sections: {}, experiences: [], site: {} }))
    res = await request((globalThis as any).serverApp).put('/api/profile').send({ highlightsEnabled: true, availability: { value: long } })
    expect(res.status).toBe(422)

    // success path
    repoAny.getContent.mockImplementationOnce(async () => ({ profile: { name: 'A', title: '', tagline: '', summary: '', location: 'L', email: 'a@b.com', social: { linkedin: '', github: '' }, contactVisibility: {}, highlightsEnabled: false, availability: { value: '', enabled: true }, focusAreas: { value: '', enabled: true } }, posts: [], sections: {}, experiences: [], site: {} }))
    repoAny.saveProfile.mockImplementationOnce(async (p: any) => p)
    res = await request((globalThis as any).serverApp).put('/api/profile').send({ name: 'Name', email: 'n@e.com' })
    expect(res.status).toBe(200)
  })

  it('PUT /api/posts validation and save', async () => {
    const repo = await import('./repository.js')
    const repoAny: any = repo

    // non-array payload
    let res = await request((globalThis as any).serverApp).put('/api/posts').send({})
    expect(res.status).toBe(400)

    // invalid post (missing title)
    res = await request((globalThis as any).serverApp).put('/api/posts').send([{ id: '1', content: 'x', tags: [] }])
    expect(res.status).toBe(422)

    // success
    repoAny.savePosts.mockImplementationOnce(async (p: any) => p)
    res = await request((globalThis as any).serverApp).put('/api/posts').send([{ id: '1', title: 'T', content: 'C', tags: [] }])
    expect(res.status).toBe(200)
  })

  it('PUT /api/sections branches', async () => {
    const repo = await import('./repository.js')
    const repoAny: any = repo

    // getContent failure
    repoAny.getContent.mockImplementationOnce(async () => { throw new Error('boom') })
    let res = await request((globalThis as any).serverApp).put('/api/sections').send({})
    expect(res.status).toBe(500)

    // validation failure
    repoAny.getContent.mockImplementationOnce(async () => ({ sections: { contact: { description: 'orig' }, experiencesPage: { visible: true }, educations: { visible: true, items: [] }, programmingLanguages: { visible: true, items: [] }, languagesSpoken: { visible: true, items: [] }, achievements: { visible: true, items: [] } }, posts: [], profile: {}, experiences: [], site: {} }))
    res = await request((globalThis as any).serverApp).put('/api/sections').send({ contact: { description: '' } })
    expect(res.status).toBe(422)

    // success
    repoAny.getContent.mockImplementationOnce(async () => ({ sections: { contact: { description: 'orig' }, experiencesPage: { visible: true }, educations: { visible: true, items: [] }, programmingLanguages: { visible: true, items: [] }, languagesSpoken: { visible: true, items: [] }, achievements: { visible: true, items: [] } }, posts: [], profile: {}, experiences: [], site: {} }))
    repoAny.saveSections.mockImplementationOnce(async (s: any) => s)
    res = await request((globalThis as any).serverApp).put('/api/sections').send({ contact: { description: 'ok' } })
    expect(res.status).toBe(200)
  })

  it('PUT /api/experiences validation and save', async () => {
    const repo = await import('./repository.js')
    const repoAny: any = repo

    // non-array
    let res = await request((globalThis as any).serverApp).put('/api/experiences').send({})
    expect(res.status).toBe(400)

    // invalid experience
    res = await request((globalThis as any).serverApp).put('/api/experiences').send([{ role: '', company: '', year: '', description: '', achievements: [], stack: [] }])
    expect(res.status).toBe(422)

    // success
    repoAny.saveExperiences.mockImplementationOnce(async (p: any) => p)
    res = await request((globalThis as any).serverApp).put('/api/experiences').send([{ role: 'R', company: 'C', year: 'Y', description: 'D', achievements: ['a'], stack: ['s'] }])
    expect(res.status).toBe(200)
  })

  it('login sets session and /api/auth/me and logout', async () => {
    // perform login
    const loginRes = await request((globalThis as any).serverApp).post('/api/auth/login').send({ email: process.env.ADMIN_EMAIL, password: 'x' })
    expect(loginRes.status).toBe(200)
    const cookies = loginRes.headers['set-cookie']
    expect(cookies).toBeDefined()

    // call /api/auth/me with cookie
    const meRes = await request((globalThis as any).serverApp).get('/api/auth/me').set('Cookie', cookies)
    expect(meRes.status).toBe(200)
    expect(meRes.body).toHaveProperty('email')

    // logout
    const outRes = await request((globalThis as any).serverApp).post('/api/auth/logout').set('Cookie', cookies)
    expect(outRes.status).toBe(200)
    expect(outRes.body).toHaveProperty('success', true)
  })

  it('unknown route returns 404', async () => {
    const res = await request((globalThis as any).serverApp).get('/no-such-route')
    expect(res.status).toBe(404)
  })
})
