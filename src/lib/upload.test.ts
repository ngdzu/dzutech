import { vi, describe, test, expect } from 'vitest'
import { uploadFile } from './upload'

describe('uploadFile', () => {
  test('throws when server returns non-ok', async () => {
  // mock fetch with a typed unknown override compatible with globalThis
  ;(globalThis as unknown as { fetch?: unknown }).fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'err' }))
    const file = new File(['x'], 'x.png', { type: 'image/png' })
    await expect(uploadFile(file)).rejects.toThrow('Upload failed: 500')
  })

  test('parses response when ok', async () => {
    const payload = { url: '/uploads/x.png', filename: 'x.png', mimetype: 'image/png' }
  ;(globalThis as unknown as { fetch?: unknown }).fetch = vi.fn(async () => ({ ok: true, json: async () => payload }))
    const file = new File(['x'], 'x.png', { type: 'image/png' })
    const res = await uploadFile(file)
    expect(res).toEqual(payload)
  })
})
