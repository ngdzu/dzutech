import { describe, it, expect, vi } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Create a mock of the 'pg' module that exports the Pool class and also
// exposes the mock functions so tests can manipulate their behavior. We
// avoid referencing vi.fn() variables before the mock is hoisted by
// creating the mock functions inside the factory and exporting them.
// Import read/write helpers. The 'pg' module is mocked in a separate test file
// for environment branch coverage so these unit tests can import the helpers
// and use the controlled mock provided in that file's factory.
// Provide a simple mock for 'pg' that exposes the query/on mocks which the
// helpers will use. This mock is hoisted by vitest so it exists before the
// module under test is imported.
vi.mock('pg', () => {
  const q = vi.fn()
  const o = vi.fn()

  return {
    Pool: class {
      query = q
      on = o
      constructor() {}
    },
    __mockQuery: q,
    __mockOn: o,
  }
})

import { readJson, writeJson } from './db'
import * as pgMock from 'pg'

type PgMockShape = {
  __mockQuery: ReturnType<typeof vi.fn>
  __mockOn: ReturnType<typeof vi.fn>
}

const typedPgMock = pgMock as unknown as PgMockShape
const mockQuery = typedPgMock.__mockQuery
const mockOn = typedPgMock.__mockOn

beforeEach(() => {
  mockQuery.mockReset()
  mockOn.mockReset()
})

describe('readJson', () => {
  it('returns parsed object when key exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ value_text: JSON.stringify({ a: 1 }) }] })

    const result = await readJson('some-key')

    expect(result).toEqual({ a: 1 })
    expect(mockQuery).toHaveBeenCalled()
    // second argument to pool.query should be the params array
    expect(mockQuery.mock.calls[0][1]).toEqual(['some-key'])
  })

  it('returns undefined when no row is found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const result = await readJson('missing')

    expect(result).toBeUndefined()
  })

  it('propagates query errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db-fail'))

    await expect(readJson('err')).rejects.toThrow('db-fail')
  })
})

describe('writeJson', () => {
  it('calls pool.query with JSON serialized value', async () => {
    mockQuery.mockResolvedValueOnce({})

    const payload = { hello: 'world' }
    await writeJson('k', payload)

    expect(mockQuery).toHaveBeenCalled()
    const params = mockQuery.mock.calls[0][1]
    expect(params[0]).toBe('k')
    expect(params[1]).toBe(JSON.stringify(payload))
  })

  it('propagates write errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('write-fail'))

    await expect(writeJson('k2', { x: 1 })).rejects.toThrow('write-fail')
  })
})
