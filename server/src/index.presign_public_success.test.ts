import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'

// Hoist-safe mocking: reset modules and mock before importing app
beforeEach(() => {
  vi.resetModules()
})

describe('generatePresignedUrlForKey with PUBLIC_S3_ENDPOINT success', () => {
  beforeEach(() => {
    // Mock getSignedUrl to return a known presigned URL
    vi.doMock('@aws-sdk/s3-request-presigner', async () => {
      return {
        getSignedUrl: async () => 'https://public.example/presigned?X=1',
      }
    })

    // Minimal S3 client mock to satisfy imports (not used by presign path)
    vi.doMock('@aws-sdk/client-s3', async () => {
      return {
        S3Client: function Dummy() {
          return { send: async () => ({}) }
        },
        // Export constructible commands since index.ts uses `new GetObjectCommand(...)`
        GetObjectCommand: class GetObjectCommand { input: Record<string, unknown>
          constructor(input: Record<string, unknown>) { this.input = input }
        },
        DeleteObjectCommand: class DeleteObjectCommand { input: Record<string, unknown>
          constructor(input: Record<string, unknown>) { this.input = input }
        },
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns presigned url using PUBLIC_S3_ENDPOINT when configured', async () => {
    // Set env vars before importing app
    process.env.S3_BUCKET = 'test-bucket'
    process.env.PUBLIC_S3_ENDPOINT = 'https://public.example'
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'

    const { app } = await import('./index.js')
    const request = supertest(app)

  // Call /photos/:id which will attempt to generate a presigned URL
  const res = await request.get('/photos/test-key')
  // When presigning succeeds the handler redirects to the presigned URL
  expect(res.status).toBe(302)
  expect(String(res.headers.location)).toContain('https://public.example/presigned')
  })
})
