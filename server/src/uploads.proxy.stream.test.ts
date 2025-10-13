import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import stream from 'stream'

beforeEach(() => {
  vi.resetModules()
})

describe('/uploads/* proxy streaming branch', () => {
  beforeEach(() => {
    // Mock S3 client to return a Body with a pipe() implementation
    vi.doMock('@aws-sdk/client-s3', async () => {
      return {
        S3Client: function Dummy() {
          return {
            send: async (cmd: Record<string, unknown>) => {
              // When index.ts constructs new GetObjectCommand({ Bucket, Key })
              // the cmd object here will be an instance with an `input` property.
              const c = cmd as Record<string, unknown> | undefined
              if (c && typeof c === 'object' && 'input' in c) {
                const input = ((c as unknown) as { input?: Record<string, unknown> }).input
                if (input && typeof input === 'object' && 'Key' in input) {
                  const readable = new stream.Readable({
                    read() {
                      this.push('hello-stream')
                      this.push(null)
                    }
                  })
                  return { Body: readable, ContentType: 'text/plain' }
                }
              }
              return {}
            }
          }
        },
        GetObjectCommand: class GetObjectCommand { input: Record<string, unknown>
          constructor(input: Record<string, unknown>) { this.input = input }
        },
      }
    })

    // Minimal presigner mock so imports succeed
    vi.doMock('@aws-sdk/s3-request-presigner', async () => ({ getSignedUrl: async () => 'https://presigned' }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('streams the object when S3 Body supports pipe', async () => {
    process.env.S3_BUCKET = 'test-bucket'
    process.env.S3_ENDPOINT = 'https://s3.example'
    process.env.AWS_ACCESS_KEY_ID = 'x'
    process.env.AWS_SECRET_ACCESS_KEY = 'y'

    const { app } = await import('./index.js')
    const req = supertest(app).get('/uploads/test-file.txt')
    const res = await req
    expect(res.status).toBe(200)
    // The body should contain our streamed content
    expect(res.text).toContain('hello-stream')
    // Content-Type was set by our mock
    expect(res.headers['content-type']).toContain('text/plain')
  })
})
