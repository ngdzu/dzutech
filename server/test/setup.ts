// Vitest setup for server tests
// Provide a lightweight mock for the AWS S3 client so unit tests don't attempt real network DNS lookups.
import { vi } from 'vitest'

// Set up environment variables required for tests before any module imports
process.env.SESSION_SECRET = 'test-session-secret'
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = 'test-session'
process.env.SESSION_MAX_AGE_HOURS = '24'
process.env.NODE_ENV = 'test'
process.env.PORT = '3000'

// Create a minimal mock implementation that matches the parts of S3Client used by the server code.
vi.mock('@aws-sdk/client-s3', async () => {
  // Create a fake command class to allow code that constructs commands to still pass instanceof checks if needed.
  class MockCommand {
    constructor(public input: unknown) {
      // intentionally accept unknown input for tests
    }
  }

  // Mock S3Client with a send() method that simulates success for PutObject/GetObject
  class S3Client {
    constructor() {
      // no-op
    }
    // Accept any args from tests and return a predictable shape.
    async send(..._args: unknown[]) {
      // reference args to satisfy unused-var rules
      const [cmd] = _args
      return { $metadata: { httpStatusCode: 200 }, input: cmd }
    }
  }

  // Export minimal stubs for command constructors used in the code
  const PutObjectCommand = MockCommand
  const GetObjectCommand = MockCommand

  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
  }
})

// Also mock s3-request-presigner to avoid calling real network in getSignedUrl
vi.mock('@aws-sdk/s3-request-presigner', async () => {
  return {
    getSignedUrl: async (..._args: unknown[]) => {
      void _args
      // Return a predictable fake URL for tests
      return 'https://example.test/signed-url'
    },
  }
})

// Mock pg Pool to avoid real network connections in unit tests
vi.mock('pg', async () => {
  class MockPool {
    constructor() {
      // no-op
    }
    // Minimal query implementation with heuristics for common queries used in tests.
    async query(text: string, params?: unknown[]) {
      const sql = String(text)
      const p = Array.isArray(params) ? params : []
      // INSERT into uploads -> return a fake inserted row
      if (sql.toLowerCase().includes('insert into uploads')) {
        const key = (p[0] as string) || 'uploads/mock-file'
        const filename = (p[1] as string) || 'mock-file.png'
        const mimetype = (p[2] as string) || 'image/png'
        const size = (typeof p[3] === 'number' ? (p[3] as number) : 123)
        const width = (p[4] as number) ?? null
        const height = (p[5] as number) ?? null
        return {
          rowCount: 1,
          rows: [
            {
              id: 'mock-upload-id',
              key,
              filename,
              mimetype,
              size,
              width,
              height,
              created_at: new Date().toISOString(),
            },
          ],
        }
      }

      // SELECT ... FROM uploads WHERE id = $1 -> return a fake row if id provided
      if (sql.toLowerCase().includes('from uploads') && sql.toLowerCase().includes('where id =')) {
        const id = String(p[0] ?? '')
        return {
          rowCount: 1,
          rows: [
            {
              id: id || 'mock-upload-id',
              key: `uploads/${id || 'mock-file.png'}`,
              filename: id ? `${id}.png` : 'mock-file.png',
              mimetype: 'image/png',
              size: 123,
              width: null,
              height: null,
              created_at: new Date().toISOString(),
            },
          ],
        }
      }

      // SELECT COUNT(*) FROM uploads -> return zero
      if (sql.toLowerCase().includes('select count(*)') || sql.toLowerCase().includes("select count(")) {
        return { rowCount: 1, rows: [{ count: '0' }] }
      }

      // Default: no rows
      void p
      return { rowCount: 0, rows: [] }
    }
    // Allow attaching an 'error' handler as in the real Pool
    on(event: string, handler: (err: unknown) => void) {
      void event
      void handler
      // no-op in tests
    }
    // End/close methods if tests call them
    async end() {
      return
    }
  }

  return { Pool: MockPool }
})

// Mock sharp to simulate image processing in tests and avoid ENOENT when code
// calls pipeline.resize().toFile(filepath)
vi.mock('sharp', async () => {
  const fs = await import('fs/promises')
  const path = await import('path')

  // Helper that writes a file and waits briefly for the file system to
  // reflect the created file. This prevents flaky ENOENT in the tests.
  async function writeFileEnsure(filepath: string, buf: Buffer) {
    await fs.mkdir(path.dirname(filepath), { recursive: true })
    await fs.writeFile(filepath, buf)
    // Ensure the file exists (stat will throw if it does not); give the OS
    // a tiny moment to flush if necessary. Retry once if needed.
    try {
      await fs.stat(filepath)
      } catch {
      // brief retry
      await new Promise((r) => setTimeout(r, 5))
      await fs.stat(filepath)
    }
  }

  // The mocked sharp function returns a pipeline object that holds the input buffer
  function sharp(input: unknown) {
    const buf = Buffer.from(input as Buffer)
    const pipeline = {
      resize: (_opts: unknown) => ({
        // toFile writes the original input buffer to the given filepath so
        // subsequent fs.readFile calls in the code succeed. Ensure the
        // directory exists first to avoid ENOENT.
        toFile: async (filepath: string) => {
          await writeFileEnsure(filepath, buf)
        },
        // reference _opts to satisfy no-unused-vars lint
        toBuffer: async () => {
          void _opts
          return Buffer.from(buf)
        },
      }),
      toBuffer: async () => Buffer.from(buf),
    }
    return pipeline
  }

  return {
    default: sharp,
  }
})
