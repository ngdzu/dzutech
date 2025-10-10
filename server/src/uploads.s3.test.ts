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

describe('uploadHandler S3 and pipeline branches', () => {
  it('uploads to S3 and returns canonical /photos/:id', async () => {
    vi.resetModules()
    // enable S3 env
    process.env.S3_ENDPOINT = 'https://minio.test'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA'
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET'
    process.env.S3_BUCKET = 'test-bucket'
    process.env.S3_REGION = 'us-east-1'

    // mock file-type to a supported png
    await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/png' }) }))

    // mock sharp to simply toBuffer
    await vi.doMock('sharp', async () => ({ default: (input: unknown) => ({ resize: () => ({ toBuffer: async () => Buffer.from(input as Buffer) }) }) }))

    // mock S3 client - class with send method
    await vi.doMock('@aws-sdk/client-s3', async () => {
      class PutObjectCommand { constructor(public argv: any) {} }
      class S3Client { send: (cmd: any) => Promise<any> = async () => ({}) }
      return { S3Client, PutObjectCommand }
    })

    // mock repository.saveUpload to return a DB record
    await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 's3-mock-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-s3-'))
    process.env.UPLOAD_DIR = tmp

    const buf = Buffer.from([0x89,0x50,0x4e,0x47])
    const req: any = { file: { originalname: 's3.png', mimetype: 'image/png', buffer: buf } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.payload).toBeDefined()
    expect(res.payload.url).toBe('/photos/s3-mock-id')

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('falls back to filesystem when S3 send throws and still persists metadata', async () => {
    vi.resetModules()
    // enable S3 env
    process.env.S3_ENDPOINT = 'https://minio.test'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA'
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET'
    process.env.S3_BUCKET = 'test-bucket'

    // mock file-type to png
    await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/png' }) }))

    // mock sharp to toBuffer
    await vi.doMock('sharp', async () => ({ default: (input: unknown) => ({ resize: () => ({ toBuffer: async () => Buffer.from(input as Buffer) }) }) }))

    // mock S3 client to throw on send
    await vi.doMock('@aws-sdk/client-s3', async () => {
      class PutObjectCommand { constructor(public argv: any) {} }
      class S3Client { send: (cmd: any) => Promise<any> = async () => { throw new Error('s3 down') } }
      return { S3Client, PutObjectCommand }
    })

    // mock repository.saveUpload to return filesystem-save record
    await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 'fs-mock-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-s3-'))
    process.env.UPLOAD_DIR = tmp

    const buf = Buffer.from([0x89,0x50,0x4e,0x47])
    const req: any = { file: { originalname: 's3fail.png', mimetype: 'image/png', buffer: buf } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.payload).toBeDefined()
    // should have record id from filesystem save
    expect(res.payload.id).toBe('fs-mock-id')

    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('uses pipeline.toBuffer when resized object lacks toBuffer/toFile', async () => {
    vi.resetModules()
    delete process.env.S3_ENDPOINT
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    delete process.env.S3_BUCKET

    // mock file-type to jpeg
    await vi.doMock('file-type', async () => ({ fileTypeFromBuffer: async () => ({ mime: 'image/jpeg' }) }))

    // sharp mock: pipeline.resize returns an empty object, but pipeline has toBuffer
    await vi.doMock('sharp', async () => ({ default: (input: unknown) => ({ resize: () => ({}), toBuffer: async () => Buffer.from(input as Buffer) }) }))

    await vi.doMock('./repository.js', async () => ({ saveUpload: async (u: any) => ({ id: 'pipe-id', filename: u.filename, mimetype: u.mimetype, size: u.size }) }))

    const { uploadHandler } = await import('./uploads.js')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-s3-'))
    process.env.UPLOAD_DIR = tmp

    const buf = Buffer.from([0xff,0xd8,0xff])
    const req: any = { file: { originalname: 'pipe.jpg', mimetype: 'image/jpeg', buffer: buf } }
    const res = createRes()

    await uploadHandler(req, res)
    expect(res.payload).toBeDefined()
    expect(res.payload.id).toBe('pipe-id')

    await fs.rm(tmp, { recursive: true, force: true })
  })
})
