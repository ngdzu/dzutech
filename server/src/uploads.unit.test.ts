/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// helper to create a fake response object
const createRes = () => {
  const res: any = {}
  res.status = (code: number) => { res.statusCode = code; return res }
  res.json = (payload: unknown) => { res.payload = payload; return res }
  return res
}

describe('uploadHandler normalization branches', () => {
  it('handles buffer-like object with arrayBuffer()', async () => {
    vi.resetModules()
    // mock repository.saveUpload to avoid real DB connections during unit tests
    vi.mock('./repository.js', () => ({
      saveUpload: async (upload: any) => ({
        id: 'mock-id',
        key: upload.key,
        filename: upload.filename,
        mimetype: upload.mimetype ?? null,
        size: upload.size ?? null,
        width: null,
        height: null,
        created_at: new Date().toISOString(),
      }),
    }))
    // mock file-type to indicate a PNG
    vi.mock('file-type', () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/png' }) }))
    // mock sharp to write the resized buffer to the requested filepath so
    // uploadHandler's subsequent fs.readFile() succeeds and avoids ENOENT.
    vi.mock('sharp', () => ({
      default: (input: unknown) => {
        const buf = Buffer.from(input as Buffer)
        return { resize: () => ({ toFile: async (filepath: string) => {
          await fs.mkdir(path.dirname(filepath), { recursive: true })
          await fs.writeFile(filepath, buf)
        }, toBuffer: async () => Buffer.from(buf) }) }
      },
    }))

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-unit-'))
    process.env.UPLOAD_DIR = tmp
    const { uploadHandler } = await import('./uploads.js')

    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const blobLike = { async arrayBuffer() { return buf.buffer } }

    const req: any = { file: { originalname: 'a.png', mimetype: 'image/png', buffer: blobLike } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.statusCode).toBeUndefined()
    expect(res.payload).toBeDefined()

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('handles ArrayBufferView (Uint8Array)', async () => {
    vi.resetModules()
    // mock repository.saveUpload to avoid real DB connections during unit tests
    vi.mock('./repository.js', () => ({
      saveUpload: async (upload: any) => ({
        id: 'mock-id',
        key: upload.key,
        filename: upload.filename,
        mimetype: upload.mimetype ?? null,
        size: upload.size ?? null,
        width: null,
        height: null,
        created_at: new Date().toISOString(),
      }),
    }))
    vi.mock('file-type', () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/jpeg' }) }))
    vi.mock('sharp', () => ({
      default: (input: unknown) => {
        const buf = Buffer.from(input as Buffer)
        return { resize: () => ({ toFile: async (filepath: string) => {
          await fs.mkdir(path.dirname(filepath), { recursive: true })
          await fs.writeFile(filepath, buf)
        }, toBuffer: async () => Buffer.from(buf) }) }
      },
    }))

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-unit-'))
    process.env.UPLOAD_DIR = tmp
    const { uploadHandler } = await import('./uploads.js')

    const u8 = new Uint8Array([0xff, 0xd8, 0xff])
    const req: any = { file: { originalname: 'b.jpg', mimetype: 'image/jpeg', buffer: u8 } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.statusCode).toBeUndefined()
    expect(res.payload).toBeDefined()

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('handles buffer-like object with .data field', async () => {
    vi.resetModules()
    // mock repository.saveUpload to avoid real DB connections during unit tests
    vi.mock('./repository.js', () => ({
      saveUpload: async (upload: any) => ({
        id: 'mock-id',
        key: upload.key,
        filename: upload.filename,
        mimetype: upload.mimetype ?? null,
        size: upload.size ?? null,
        width: null,
        height: null,
        created_at: new Date().toISOString(),
      }),
    }))
    vi.mock('file-type', () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/webp' }) }))
    vi.mock('sharp', () => ({
      default: (input: unknown) => {
        const buf = Buffer.from(input as Buffer)
        return { resize: () => ({ toFile: async (filepath: string) => {
          await fs.mkdir(path.dirname(filepath), { recursive: true })
          await fs.writeFile(filepath, buf)
        }, toBuffer: async () => Buffer.from(buf) }) }
      },
    }))

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-unit-'))
    process.env.UPLOAD_DIR = tmp
    const { uploadHandler } = await import('./uploads.js')

    const u8 = new Uint8Array([0x52, 0x49, 0x46, 0x46])
    const wrapper = { data: u8 }
    const req: any = { file: { originalname: 'c.webp', mimetype: 'image/webp', buffer: wrapper } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.statusCode).toBeUndefined()
    expect(res.payload).toBeDefined()

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('returns 400 if buffer cannot be normalized', async () => {
    vi.resetModules()
    // mock repository.saveUpload to avoid real DB connections during unit tests
    vi.mock('./repository.js', () => ({
      saveUpload: async (upload: any) => ({
        id: 'mock-id',
        key: upload.key,
        filename: upload.filename,
        mimetype: upload.mimetype ?? null,
        size: upload.size ?? null,
        width: null,
        height: null,
        created_at: new Date().toISOString(),
      }),
    }))
    const { uploadHandler } = await import('./uploads.js')
    const req: any = { file: { originalname: 'd.png', mimetype: 'image/png', buffer: null } }
    const res = createRes()
    await uploadHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload).toHaveProperty('message')
  })
})
