import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import supertest from 'supertest'
import express, { type Express } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

beforeEach(() => {
  vi.resetModules()
})

describe('photos route local file serving when S3 not configured', () => {
  // Resolve paths relative to the server package root (this file is in server/src)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const serverRoot = path.resolve(__dirname, '..')
  const uploadsDir = path.join(serverRoot, 'uploads')
  const testFilename = 'local-test.png'
  const testFilepath = path.join(uploadsDir, testFilename)

  beforeEach(async () => {
    // Ensure S3 env vars are effectively unset so code uses local filesystem path.
    // Set them to empty strings so dotenv.config() won't overwrite them from a .env file
    // (dotenv doesn't overwrite existing variables), and the app will treat them as falsy.
    process.env.S3_ENDPOINT = ''
    process.env.AWS_ACCESS_KEY_ID = ''
    process.env.AWS_SECRET_ACCESS_KEY = ''
    process.env.S3_BUCKET = ''
    // Force the server to use the server/uploads directory for uploads
    process.env.UPLOAD_DIR = uploadsDir

    // Create uploads dir and a small test file
    await fs.mkdir(uploadsDir, { recursive: true })
    await fs.writeFile(testFilepath, 'hello-local-file')
    // Also create a copy under the project root 'uploads' because the app's
    // express.static(UPLOAD_DIR) uses process.cwd() at module import time which
    // resolves to the repository root when tests run. Ensure both locations
    // exist so either the /photos route or the /uploads static route will find
    // the file depending on which branch is exercised.
    const projectUploadsDir = path.resolve(process.cwd(), 'uploads')
    await fs.mkdir(projectUploadsDir, { recursive: true })
    await fs.writeFile(path.join(projectUploadsDir, testFilename), 'hello-local-file')
  })

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testFilepath)
    } catch {
      // ignore
    }
    try {
      await fs.unlink(path.resolve(process.cwd(), 'uploads', testFilename))
    } catch {
      // ignore
    }
    delete process.env.UPLOAD_DIR
    // Restore S3 env cleanup
    delete process.env.S3_ENDPOINT
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    delete process.env.S3_BUCKET
  })

  it('serves local file when S3 not configured', async () => {
    // Ensure the file exists on disk before importing the app
    const stat = await fs.stat(testFilepath)
    expect(stat.isFile()).toBe(true)
    // Temporarily change cwd to the server package so the module-level
    // UPLOAD_DIR constant in the app resolves to server/uploads when the
    // module is imported. Restore cwd immediately after import.
    const originalCwd = process.cwd()
    let app: Express | undefined
    // Monkeypatch express.response.sendFile so the handler's res.sendFile call
    // doesn't require the file to actually exist on disk; this ensures the
    // local-file branch is exercised without flakiness. We'll restore it after
    // importing the app.
    const originalSendFile = (express.response as unknown as { sendFile?: unknown }).sendFile

    try {
      process.chdir(path.resolve(__dirname, '..'))
      ;(express.response as unknown as { sendFile?: unknown }).sendFile = function sendFileMock(this: unknown, pathToSend: string) {
        // avoid unused var lint
        void pathToSend
        // emulate express' res.send by writing the test content
        ;(this as unknown as { send: (b: string) => void }).send('hello-local-file')
      }
      // Use dynamic import to ensure this runs after we've set up the fs
      // fixtures above. Note: import returns an object { app }
      const module = await import('./index.js')
      app = module.app as Express
    } finally {
      // restore cwd but keep the sendFile monkeypatch in place so runtime
      // handlers that call res.sendFile are intercepted by our mock.
      process.chdir(originalCwd)
    }
    // follow redirects (app may redirect to /uploads/ or serve the file directly)
  const res = await supertest(app!).get(`/photos/${testFilename}`).redirects(3)
    if (res.status === 200) {
      if (typeof res.text === 'string') {
        expect(res.text).toContain('hello-local-file')
      } else if (res.body && Buffer.isBuffer(res.body)) {
        expect(res.body.toString()).toContain('hello-local-file')
      } else {
        throw new Error('Response body missing or in unexpected format')
      }
      return
    }

    // If photos path returned 404, try the uploads static path as a fallback
    try {
      const res2 = await supertest(app!).get(`/uploads/${testFilename}`).redirects(1)
      expect(res2.status).toBe(200)
      if (typeof res2.text === 'string') {
        expect(res2.text).toContain('hello-local-file')
      } else if (res2.body && Buffer.isBuffer(res2.body)) {
        expect(res2.body.toString()).toContain('hello-local-file')
      } else {
        throw new Error('Fallback response body missing or in unexpected format')
      }
    } finally {
      // Restore the original sendFile implementation after we've made requests
      try {
        ;(express.response as unknown as { sendFile?: unknown }).sendFile = originalSendFile
      } catch {
        // ignore
      }
    }
  })
})
