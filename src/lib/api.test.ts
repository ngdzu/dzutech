import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'
import * as api from './api'

describe('src/lib/api', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('fetchContent calls /api/content and returns json', async () => {
        const payload = { foo: 'bar' }
            ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => payload })

        const res = await api.fetchContent()
        expect(res).toEqual(payload)
        expect(globalThis.fetch).toHaveBeenCalled()
        const [calledUrl] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/content$/)
    })

    it('updateProfile sends PUT with JSON body and returns result', async () => {
        const payload = { name: 'Alice' }
            ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, id: 'x' }) })

        const res = await api.updateProfile(payload)
        expect(res).toHaveProperty('id', 'x')

        expect(globalThis.fetch).toHaveBeenCalled()
        const [calledUrl, init] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/profile$/)
        expect(init.method).toBe('PUT')
        expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
        expect(init.body).toBe(JSON.stringify(payload))
    })

    it('updateProfile throws with server message when response not ok', async () => {
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized',
            json: async () => ({ message: 'bad token' }),
        })

        await expect(api.updateProfile({} as Record<string, unknown>)).rejects.toThrow('bad token')
    })

    it('updateProfile falls back to statusText when json parsing fails', async () => {
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({
            ok: false,
            statusText: 'Nope',
            json: async () => {
                throw new Error('parse failed')
            },
        })

        await expect(api.updateProfile({} as Record<string, unknown>)).rejects.toThrow('Nope')
    })

    it('login posts credentials and returns user', async () => {
        const user = { email: 'a@b.com' }
            ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => user })

        const res = await api.login({ email: 'a@b.com', password: 'pw' })
        expect(res).toEqual(user)
        const [calledUrl, init] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/auth\/login$/)
        expect(init.method).toBe('POST')
    })

    it('logout posts and resolves when server returns success', async () => {
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
        await expect(api.logout()).resolves.toBeUndefined()
        const [calledUrl, init] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/auth\/logout$/)
        expect(init.method).toBe('POST')
    })
})
