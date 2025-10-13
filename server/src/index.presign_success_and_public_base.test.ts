/* eslint-disable @typescript-eslint/no-explicit-any */
// Focused tests for presign-success and PUBLIC_BASE_URL redirect branches
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

describe('presign success and PUBLIC_BASE_URL redirect', () => {
  it('redirects to presigned URL when getSignedUrl returns a URL', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    delete process.env.PUBLIC_S3_ENDPOINT

    vi.resetModules()
    // repository returns record for UUID
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => (id === 'uuid-ps' ? { id: 'uuid-ps', filename: 'ps.png', key: 'uploads/ps.png' } : null)) }))
    // Mock getSignedUrl to return a usable URL
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => 'https://signed.example/ps.png' }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/photos/uuid-ps')
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toBe('https://signed.example/ps.png')
  })

  it('returns PUBLIC_BASE_URL proxy-style redirect for non-UUID param when PUBLIC_BASE_URL is set', async () => {
    // When S3 is configured and PUBLIC_BASE_URL is present, /photos/:id should redirect to /uploads/<filename>
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    process.env.PUBLIC_BASE_URL = 'https://cdn.example'

    vi.resetModules()
    // No DB lookup (non-UUID param), so do not mock repository.getUploadById

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/photos/some-file-name.png')
    expect(res.status).toBe(302)
    // When PUBLIC_BASE_URL is set, code redirects to /uploads/<filename>
    expect(String(res.headers.location)).toMatch(/^\/uploads\//)
  })
})
