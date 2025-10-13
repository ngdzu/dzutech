/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests to exercise S3 proxy body handling in /uploads/* (arrayBuffer fallback and missing body -> 404)
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24'
process.env.NODE_ENV = 'test'

import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'

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

describe('uploads proxy body handling', () => {
  it('uses arrayBuffer fallback when body is not a stream', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'

    vi.resetModules()
    // Mock S3Client.send to return a Body with arrayBuffer
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: class {
        send() {
          return Promise.resolve({ ContentType: 'image/png', ContentLength: 3, Body: { arrayBuffer: async () => new Uint8Array([1,2,3]).buffer } })
        }
      },
      GetObjectCommand: class {}
    }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/uploads/test.png')
    expect(res.status).toBe(200)
    // body should be the three bytes we returned
    expect(Buffer.from(res.body).length).toBe(3)
    expect(res.headers['content-type']).toBe('image/png')
  })

  it('returns 404 when S3 returns no body', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'

    vi.resetModules()
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: class { send() { return Promise.resolve({}) } },
      GetObjectCommand: class {}
    }))

    const mod = await import('./index.js')
    const app = (mod as any).app

    const res = await request(app).get('/uploads/missing.png')
    expect(res.status).toBe(404)
  })
})
