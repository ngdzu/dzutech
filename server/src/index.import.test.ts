// Lightweight import test for server/index.ts using hoist-safe vi.mock factories
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from 'vitest'

// Ensure env required by index.ts are present before import
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'a'.repeat(32)
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'hash'
process.env.SESSION_NAME = process.env.SESSION_NAME || 'dzutech.sid'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS || '1'
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

// Hoist-safe mocks
vi.mock('express', () => {
  const expressFactory = () => ({
    set: () => {},
    use: () => {},
    listen: (port: number, cb?: () => void) => { if (typeof cb === 'function') cb() },
    get: () => {},
    post: () => {},
    put: () => {},
    patch: () => {},
    delete: () => {},
  })
  ;(expressFactory as any).json = () => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() }
  ;(expressFactory as any).static = (dir: unknown) => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() }
  return { default: expressFactory }
})

vi.mock('express-session', () => ({ default: () => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() } }))
vi.mock('connect-pg-simple', () => ({ default: (session: any) => {
  const Base = (session && session.Store) ? session.Store : class {}
  class MockStore extends Base {
    constructor(...args: any[]) { super(...args) }
    on() {}
    get(sid: any, cb: any) { cb && cb() }
    set(sid: any, sess: any, cb: any) { cb && cb() }
    destroy(sid: any, cb: any) { cb && cb() }
  }
  return MockStore
} }))
vi.mock('express-rate-limit', () => ({ default: () => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() } }))
vi.mock('bcryptjs', () => ({ compare: async () => true }))
vi.mock('./uploads.js', () => ({ default: (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() } }))
vi.mock('./repository.js', () => ({
  getContent: async () => ({ posts: [], profile: {}, sections: {}, experiences: [], site: {} }),
  resetContent: async () => ({}),
  saveExperiences: async () => [],
  savePosts: async () => [],
  saveProfile: async () => ({}),
  saveSections: async () => ({}),
  removePostById: async () => [],
  setPostHidden: async () => [],
}))
vi.mock('./db.js', () => ({ pool: {} }))
vi.mock('./requireAuth.js', () => ({ requireAuth: (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() } }))

describe('server/index import', () => {
  it('imports without throwing', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeTruthy()
  })
})
