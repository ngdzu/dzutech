/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24'
process.env.NODE_ENV = 'test'

import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'

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

describe('presign success and admin uploads list', () => {
  it('returns presigned URL when getSignedUrl succeeds for /photos/:id', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    // Ensure no PUBLIC_S3_ENDPOINT to use default client
    delete process.env.PUBLIC_S3_ENDPOINT

    vi.resetModules()
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => (id === 'uuid-20' ? { id: 'uuid-20', filename: 'ok.png', key: 'uploads/ok.png' } : null)) }))
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => 'https://signed.example/ok.png' }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/photos/uuid-20')
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toBe('https://signed.example/ok.png')
  })

  it('admin GET /api/admin/uploads includes presignedUrl when S3 is configured', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'

    vi.resetModules()
    const rows = [{ id: 'r1', key: 'uploads/r1.png' }]
    vi.doMock('./repository.js', () => ({ listUploads: vi.fn(async () => ({ rows, total: 1 })) }))
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => 'https://signed.example/r1.png' }))
    vi.doMock('./requireAuth.js', () => ({ requireAuth: (req: any, _res: any, next: any) => { req.session = req.session || {}; req.session.user = { email: process.env.ADMIN_EMAIL }; next() } }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/api/admin/uploads')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('uploads')
    expect(Array.isArray(res.body.uploads)).toBe(true)
    expect(res.body.uploads[0]).toHaveProperty('presignedUrl', 'https://signed.example/r1.png')
  })
})
