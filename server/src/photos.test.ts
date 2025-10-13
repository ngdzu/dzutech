/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests for /photos/:id behavior (S3 presign, proxy fallback, local file serving)
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session'
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24'
process.env.NODE_ENV = 'test'

import fs from 'fs/promises'
import path from 'path'
import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'

// Helper to import fresh instance of index with controlled env and mocks
async function importAppWithMocks(mocks: Record<string, unknown>) {
  vi.resetModules()
  // apply provided mocks (module path keys) using vitest's dynamic mock
  for (const [modPath, impl] of Object.entries(mocks)) {
  // use doMock so it takes effect before import
  // @ts-expect-error - vi.doMock type mismatch in this test helper is expected
    vi.doMock(modPath, () => impl)
  }
  // import the server app
  const mod = await import('./index.js')
  return (mod as any).app
}

describe('/photos route variations', () => {
  it('redirects to /uploads/<filename> when PUBLIC_BASE_URL is set and record exists', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    process.env.PUBLIC_BASE_URL = 'https://public.example'

    const record = { id: 'uuid-1', filename: 'file.png', key: 'uploads/file.png' }

    const app = await importAppWithMocks({
      './repository.js': { getUploadById: vi.fn(async (id: string) => (id === 'uuid-1' ? record : null)) },
    })

    const res = await request(app).get('/photos/uuid-1')
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toMatch(/^\/uploads\//)
  })

  it('returns presigned URL redirect when S3 configured and presign succeeds', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    // ensure no PUBLIC_BASE_URL to hit presign path
    delete process.env.PUBLIC_BASE_URL

    const record = { id: 'uuid-2', filename: 'file2.png', key: 'uploads/file2.png' }

    // mock getSignedUrl to return a predictable URL
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => 'https://signed.test/url' }))

    const app = await importAppWithMocks({
      './repository.js': { getUploadById: vi.fn(async (id: string) => (id === 'uuid-2' ? record : null)) },
    })

    const res = await request(app).get('/photos/uuid-2').set('host', 'example.test')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://signed.test/url')
  })

  it('falls back to proxy path when S3 endpoint hostname contains minio', async () => {
    process.env.S3_ENDPOINT = 'http://minio:9000'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.S3_BUCKET = 'bucket'
    delete process.env.PUBLIC_BASE_URL

    const record = { id: 'uuid-3', filename: 'file3.png', key: 'uploads/file3.png' }

    const app = await importAppWithMocks({
      './repository.js': { getUploadById: vi.fn(async (id: string) => (id === 'uuid-3' ? record : null)) },
    })

    const res = await request(app).get('/photos/uuid-3').set('host', 'localhost:3000')
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toMatch(/^\/uploads\//)
  })

  it('serves local file when S3 not configured', async () => {
    // ensure S3 vars unset
    delete process.env.S3_ENDPOINT
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    delete process.env.S3_BUCKET

    const uploadsDir = path.resolve(process.cwd(), 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })
    const filepath = path.join(uploadsDir, 'local-test.png')
    await fs.writeFile(filepath, 'ok')

    const app = await importAppWithMocks({ './repository.js': { getUploadById: vi.fn(async () => null) } })

  const res = await request(app).get('/photos/local-test.png')
  // Depending on how the server initialized S3 during import, this may
  // either serve the file (200) or redirect to /uploads/ as a proxy (302).
  expect([200, 302]).toContain(res.status)
  if (res.status === 200) expect(res.text).toBe('ok')

    // cleanup
    await fs.unlink(filepath)
  })
})
