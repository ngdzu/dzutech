/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// small helper to create fake res
const createRes = () => {
  const res: any = {}
  res.status = (code: number) => { res.statusCode = code; return res }
  res.json = (payload: unknown) => { res.payload = payload; return res }
  return res
}

describe('uploadHandler additional branches', () => {
  it('returns 400 for non-raster detected content (e.g., gif)', async () => {
    vi.resetModules()
  // disable S3 path to force filesystem flow
  delete process.env.S3_ENDPOINT
  delete process.env.AWS_ACCESS_KEY_ID
  delete process.env.AWS_SECRET_ACCESS_KEY
  delete process.env.S3_BUCKET
  // mock repository.saveUpload to succeed for this test
  await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 'mock-upload-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))
  await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/gif' }) }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-more-'))
    process.env.UPLOAD_DIR = tmp

    const req: any = { file: { originalname: 'a.gif', mimetype: 'image/gif', buffer: Buffer.from([0x47,0x49,0x46]) } }
    const res = createRes()
    await uploadHandler(req, res)
    expect(res.statusCode).toBe(400)
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('rejects SVG by text heuristic when file-type returns undefined', async () => {
    vi.resetModules()
  delete process.env.S3_ENDPOINT
  delete process.env.AWS_ACCESS_KEY_ID
  delete process.env.AWS_SECRET_ACCESS_KEY
  delete process.env.S3_BUCKET
  // mock repository.saveUpload to succeed for this test as well
  await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 'mock-upload-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))
  await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => undefined }))
    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-more-'))
    process.env.UPLOAD_DIR = tmp

    const svgText = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect /></svg>')
    const req: any = { file: { originalname: 's.svg', mimetype: 'image/svg+xml', buffer: svgText } }
    const res = createRes()
    await uploadHandler(req, res)
    expect(res.statusCode).toBe(400)
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('falls back to original buffer when sharp is unavailable', async () => {
    vi.resetModules()
  // mock file-type to a supported png
  await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/png' }) }))
  // make sharp import throw to simulate missing binary
  await vi.doMock('sharp', async () => { throw new Error('sharp missing') })
  // disable S3 env to hit filesystem fallback
  delete process.env.S3_ENDPOINT
  delete process.env.AWS_ACCESS_KEY_ID
  delete process.env.AWS_SECRET_ACCESS_KEY
  delete process.env.S3_BUCKET
  // mock repository.saveUpload to succeed
  await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 'mock-upload-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-more-'))
    process.env.UPLOAD_DIR = tmp

    const buf = Buffer.from([0x89,0x50,0x4e,0x47])
    const req: any = { file: { originalname: 'nof-sharp.png', mimetype: 'image/png', buffer: buf } }
    const res = createRes()
    await uploadHandler(req, res)
    expect(res.payload).toBeDefined()
    // global pg mock returns id 'mock-upload-id' for inserts
    expect(res.payload.id).toBeDefined()

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('on DB save failure returns uploads URL fallback', async () => {
    vi.resetModules()
    await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/png' }) }))
    // mock sharp to just toBuffer
    await vi.doMock('sharp', async () => ({ default: (input: unknown) => ({ resize: () => ({ toBuffer: async () => Buffer.from(input as Buffer) }), toBuffer: async () => Buffer.from(input as Buffer) }) }))
    // make saveUpload throw
    await vi.doMock('./repository.js', async () => ({ saveUpload: async () => { throw new Error('db down') } }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-more-'))
    process.env.UPLOAD_DIR = tmp
    process.env.PUBLIC_BASE_URL = 'https://example.test'

    const buf = Buffer.from([0xff,0xd8,0xff])
    const req: any = { file: { originalname: 'no-db.jpg', mimetype: 'image/jpeg', buffer: buf } }
    const res = createRes()
    await uploadHandler(req, res)
    expect(res.payload).toBeDefined()
    // when DB save fails, payload should contain a url that points to /uploads/
    expect(String(res.payload.url)).toContain('/uploads/')

    await fs.rm(tmp, { recursive: true, force: true })
  })
})
