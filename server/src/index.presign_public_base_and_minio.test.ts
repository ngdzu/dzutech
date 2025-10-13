import { beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'

beforeEach(() => {
  vi.resetModules()
})

describe('photos route PUBLIC_BASE_URL and minio fallback', () => {
  it('redirects to /uploads/<filename> when PUBLIC_BASE_URL is set', async () => {
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.S3_BUCKET = 'bucket'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    process.env.PUBLIC_BASE_URL = 'https://public.example'

    // Mock repository to return a record when a UUID is provided
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => ({ id, filename: 'ok.png', key: 'uploads/ok.png' })) }))

    const { app } = await import('./index.js')
    const res = await supertest(app).get('/photos/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(302)
    // PUBLIC_BASE_URL path should redirect to /uploads/<filename>
    expect(String(res.headers.location)).toBe('/uploads/ok.png')
  })

  it('falls back to proxy when configured S3 endpoint hostname contains minio', async () => {
    process.env.S3_ENDPOINT = 'http://minio:9000'
    process.env.S3_BUCKET = 'bucket'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'
    // Ensure no PUBLIC_S3_ENDPOINT so presigning uses S3_ENDPOINT and gets detected as minio
    delete process.env.PUBLIC_S3_ENDPOINT

    // Mock repository getUploadById to return a record
    vi.doMock('./repository.js', () => ({ getUploadById: vi.fn(async (id: string) => ({ id, filename: 'ok.png', key: 'uploads/ok.png' })) }))

    // Mock getSignedUrl to throw if called (should not be used in minio case)
    vi.doMock('@aws-sdk/s3-request-presigner', async () => ({ getSignedUrl: async () => { throw new Error('should not presign') } }))

    const { app } = await import('./index.js')
    const res = await supertest(app).get('/photos/00000000-0000-0000-0000-000000000000').set('Host', 'localhost')
    // When S3 endpoint is minio and host header indicates local browser, code rewrites and falls back to proxy path
    expect(res.status).toBe(302)
    expect(String(res.headers.location)).toBe('/uploads/ok.png')
  })
})
