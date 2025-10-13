/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests for presigning behavior and admin upload delete path
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24'
process.env.NODE_ENV = 'test'

import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'

// Minimal hoist-safe mocks used by server index
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

describe('generatePresignedUrlForKey and admin delete branches', () => {
  it('falls back to proxy path when PUBLIC_S3_ENDPOINT presigning fails', async () => {
    // set envs so index.js creates s3Client and generatePresignedUrlForKey will attempt public endpoint presign
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    process.env.PUBLIC_S3_ENDPOINT = 'https://public.example'

    // Mock repository to return a DB record
    vi.resetModules()
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => (id === 'uuid-10' ? { id: 'uuid-10', filename: 'file.png', key: 'uploads/file.png' } : null)) }))

    // Mock getSignedUrl to throw when public client is used
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => { throw new Error('presign failed') } }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/photos/uuid-10')
    // When presigning fails we should fall back to the proxy /uploads/... path
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toMatch(/^\/uploads\//)
  })

  it('returns proxy path when S3 endpoint hostname contains minio (no presign)', async () => {
    process.env.S3_ENDPOINT = 'http://minio:9000'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    delete process.env.PUBLIC_S3_ENDPOINT

    vi.resetModules()
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => (id === 'uuid-11' ? { id: 'uuid-11', filename: 'minio.png', key: 'uploads/minio.png' } : null)) }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/photos/uuid-11').set('host', 'localhost:3000')
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toMatch(/^\/uploads\//)
  })

  it('admin delete continues when S3 delete fails', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'

  vi.resetModules()
  // repository should return an upload and expose deleteUpload
  const deleteUpload = vi.fn(async () => ({}))
  vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async () => ({ id: 'del-1', key: 'uploads/secret.png' })), deleteUpload }))

    // Mock S3Client to throw on send (simulate S3 delete failure)
    vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: class { send() { const e: any = new Error('S3 delete failed'); e.name = 'AccessDenied'; throw e } }, DeleteObjectCommand: class {} }))

    // requireAuth should allow through and attach session user
    vi.doMock('./requireAuth.js', () => ({ requireAuth: (req: any, _res: any, next: any) => { req.session = req.session || {}; req.session.user = { email: process.env.ADMIN_EMAIL }; next() } }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).delete('/api/admin/uploads/del-1')
    // S3 delete throws but code should continue to delete DB record and respond success
    expect(res.status).toBe(200)
    // imported repository.deleteUpload should have been called
    const repo = await import('./repository.js') as any
    expect(repo.deleteUpload).toHaveBeenCalled()
  })
})
