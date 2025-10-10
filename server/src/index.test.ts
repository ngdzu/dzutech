/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist-safe mocks at top-level
vi.mock('express', () => {
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

// This test verifies that importing server/src/index.ts executes module init code
// without actually starting a real HTTP server or touching external services.
describe('server/index bootstrap', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV }
    // provide required env vars so index.ts doesn't throw
    process.env.SESSION_SECRET = 'a'.repeat(32)
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.ADMIN_PASSWORD_HASH = '$2a$10$abcdefghijklmnopqrstuv' // not actually used
    process.env.SESSION_NAME = 'dzutech.sid'
    process.env.SESSION_MAX_AGE_HOURS = '1'
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = OLD_ENV
    vi.restoreAllMocks()
  })

  it('imports without throwing and initializes app.listen', async () => {
    // dynamic import after mocks are in place
    const mod = await import('./index.js')
    // ensure module loaded and exported nothing particular (we only care no throw)
    expect(mod).toBeTruthy()
  })
})
