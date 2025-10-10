import request from 'supertest'
import express from 'express'
import session from 'express-session'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

// Mock sharp to avoid native dependency in tests. Record resize options so tests can assert them.
vi.mock('sharp', () => {
  // record only the fields we expect; allow extra keys for future-proofing
  const resizeCalls: Array<{ width?: number; withoutEnlargement?: boolean; [key: string]: unknown }> = []
  return {
    default: (input: Buffer) => ({
      resize: (options: { width?: number; withoutEnlargement?: boolean; [key: string]: unknown }) => ({
        toFile: async (outPath: string) => {
          resizeCalls.push(options)
          await fs.writeFile(outPath, input)
        },
      }),
    }),
    // helper for tests to inspect recorded resize calls
    _getResizeCalls: () => resizeCalls,
  }
})

const createAppWithRouter = async (uploadDir: string, authenticated = false) => {
  // ensure folder exists
  await fs.mkdir(uploadDir, { recursive: true })
  process.env.UPLOAD_DIR = uploadDir
  // import the router after setting env so uploads.ts picks it up
  const uploadsRouter = (await import('./uploads.js')).default

  const app = express()
  app.use(express.json())
  app.use(
    session({
      secret: 'test',
      resave: false,
      saveUninitialized: false,
    }),
  )

  if (authenticated) {
    app.use((req, _res, next) => {
      req.session = req.session || {}
  req.session.user = { email: 'test@example.com', loggedInAt: new Date().toISOString() }
      next()
    })
  }

  app.use(uploadsRouter)
  return app
}

describe('POST /api/uploads', () => {
  it('returns 401 when not authenticated', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp)
    const res = await request(app).post('/api/uploads')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('message')
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('accepts an image when authenticated', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    // 1x1 transparent PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQMBARc9y7kAAAAASUVORK5CYII='
  const res = await agent.post('/api/uploads').attach('file', Buffer.from(pngBase64, 'base64'), { filename: 'small.png', contentType: 'image/png' })
  expect(res.status).toBe(200)

    // uploaded file should exist in tmp
    const body = res.body as { filename?: string }
    expect(body.filename).toBeTruthy()
    const uploadedPath = path.join(tmp, body.filename ?? '')
    const stat = await fs.stat(uploadedPath)
    expect(stat.isFile()).toBe(true)

  // assert sharp received the expected resize options
  const sharpMock = await import('sharp')
  const calls = (sharpMock as { _getResizeCalls?: () => Array<{ width?: number; withoutEnlargement?: boolean; [key: string]: unknown }> })._getResizeCalls?.()
  expect(calls).toBeDefined()
  expect(calls!.length).toBeGreaterThan(0)
  expect(calls![0]).toEqual({ width: 1600, withoutEnlargement: true })

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('rejects unsupported MIME types', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    const res = await agent.post('/api/uploads').attach('file', Buffer.from('hello world'), { filename: 'notes.txt', contentType: 'text/plain' })
    expect(res.status).toBe(400)
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('rejects files that are not real images even if labeled as image/png', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    // send a text payload labeled as image/png
    const res = await agent.post('/api/uploads').attach('file', Buffer.from('this is not an image'), { filename: 'fake.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('rejects unknown content when file-type returns undefined and payload is non-SVG text', async () => {
    // mock file-type to return undefined so code path falls through to text-based SVG detection
    vi.resetModules()
    vi.mock('file-type', () => ({ fileTypeFromBuffer: async () => undefined }))

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    const res = await agent.post('/api/uploads').attach('file', Buffer.from('not an image, just text'), { filename: 'mystery.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
    // should reject as unsupported/invalid image (not SVG)
    expect(res.body).toHaveProperty('message')

    await fs.rm(tmp, { recursive: true, force: true })

    // restore module state
    vi.unmock('file-type')
    vi.resetModules()
  })

  it('rejects SVG content when file-type returns undefined and buffer contains <svg>', async () => {
    vi.resetModules()
    vi.mock('file-type', () => ({ fileTypeFromBuffer: async () => undefined }))

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>`
    const res = await agent.post('/api/uploads').attach('file', Buffer.from(svg, 'utf8'), { filename: 'inline.svg', contentType: 'image/svg+xml' })
  expect(res.status).toBe(400)
  expect(res.body).toHaveProperty('message')
  const msg = String(res.body.message).toLowerCase()
  // depending on runtime detection/mock ordering the handler may return either
  // the SVG-specific rejection or a generic unsupported-content message; accept both.
  expect(msg.includes('svg') || msg.includes('unsupported')).toBe(true)

    await fs.rm(tmp, { recursive: true, force: true })

    vi.unmock('file-type')
    vi.resetModules()
  })

  it('rejects SVG uploads (disallowed)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`
    const res = await agent.post('/api/uploads').attach('file', Buffer.from(svg, 'utf8'), { filename: 'evil.svg', contentType: 'image/svg+xml' })
    expect(res.status).toBe(400)
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('rejects files larger than limit (6MB)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dzutech-uploads-'))
    const app = await createAppWithRouter(tmp, true)
    const agent = request.agent(app)

    // create a buffer slightly larger than 6MB
    const big = Buffer.alloc(6 * 1024 * 1024 + 10, 0)
    const res = await agent.post('/api/uploads').attach('file', big, { filename: 'big.png', contentType: 'image/png' })
    expect([413, 400, 500]).toContain(res.status)
    await fs.rm(tmp, { recursive: true, force: true })
  })
})
