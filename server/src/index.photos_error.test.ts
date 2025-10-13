/* eslint-disable @typescript-eslint/no-explicit-any */
// Small test targeting an error branch in /photos/:id to push coverage up
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24'
process.env.NODE_ENV = 'test'

import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// Import helper that resets modules and applies mocks before importing app
async function importAppWithMocks(mocks: Record<string, unknown>) {
  vi.resetModules()
  for (const [modPath, impl] of Object.entries(mocks)) {
    // @ts-expect-error - vitest dynamic mock
    vi.doMock(modPath, () => impl)
  }
  const mod = await import('./index.js')
  return (mod as any).app
}

describe('photos route error handling', () => {
  it('returns 500 when repository.getUploadById throws', async () => {
    // Ensure S3 is not configured so the route hits the local-file branch
    // and will surface the repository error via the catch block.
    process.env.S3_ENDPOINT = ''
    process.env.AWS_ACCESS_KEY_ID = ''
    process.env.AWS_SECRET_ACCESS_KEY = ''
    process.env.S3_BUCKET = ''

    const app = await importAppWithMocks({
      './repository.js': {
        getUploadById: vi.fn(async () => { throw new Error('db down') }),
      },
    })

    const res = await request(app).get('/photos/some-id')
  expect(res.status).toBe(500)
  // The app's error handler returns a JSON body { message: 'Internal server error' }
  expect(res.body).toBeDefined()
  expect((res.body as any).message).toBe('Internal server error')
  })
})
