/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Hoist-safe mocks (top-level) to avoid vitest hoisting issues.
vi.mock('express', () => {
  // express default is a factory function that also exposes `json`
  const expressFactory = () => ({
  set: vi.fn(),
  use: vi.fn(),
  listen: vi.fn((port: number, cb?: () => void) => { if (typeof cb === 'function') cb() }),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  })
  ;(expressFactory as any).json = () => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() }
  ;(expressFactory as any).static = (dir: unknown) => (req: unknown, res: unknown, next: unknown) => { if (typeof next === 'function') (next as any)() }
  return { default: expressFactory, __esModule: true }
})

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

describe('server/index bootstrap (lightweight)', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV }
    process.env.SESSION_SECRET = 'a'.repeat(32)
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.ADMIN_PASSWORD_HASH = 'hash'
    process.env.SESSION_NAME = 'dzutech.sid'
    process.env.SESSION_MAX_AGE_HOURS = '1'
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = OLD_ENV
    vi.restoreAllMocks()
  })

  it('imports index module without starting real server', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeTruthy()
  })
})
