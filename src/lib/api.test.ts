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

    it('updatePosts sends PUT and returns posts', async () => {
        const posts = [{ id: 'p1', title: 'x', content: '', contentHtml: '', tags: [], hidden: false }]
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => posts })
        const res = await api.updatePosts(posts)
        expect(res).toEqual(posts)
        const [calledUrl, init] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/posts$/)
        expect(init.method).toBe('PUT')
    })

    it('deletePost calls DELETE and encodes id', async () => {
        const result = [{ id: 'deleted' }]
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => result })
        const res = await api.deletePost('my id/with slashes')
        expect(res).toEqual(result)
        const [calledUrl] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/posts\/my%20id%2Fwith%20slashes$/)
    })

    it('updatePostVisibility patches hidden flag', async () => {
        const out = [{ id: 'p1', hidden: true }]
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => out })
        const res = await api.updatePostVisibility('p1', true)
        expect(res).toEqual(out)
        const [calledUrl, init] = (globalThis.fetch as unknown as Mock).mock.calls[0]
        expect(calledUrl).toMatch(/\/api\/posts\/p1\/visibility$/)
        expect(init.method).toBe('PATCH')
    })

    it('updateExperiences sends PUT', async () => {
        const data = [{ role: 'r', company: 'X', year: '2020', description: '', achievements: [], stack: [], location: '' }]
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => data })
        const res = await api.updateExperiences(data)
        expect(res).toEqual(data)
    })

    it('updateSections and resetContent call respective endpoints', async () => {
        const sections = {
            contact: { description: '' },
            experiencesPage: { visible: true },
            educations: { visible: true, items: [] },
            programmingLanguages: { visible: true, items: [] },
            languagesSpoken: { visible: true, items: [] },
            achievements: { visible: true, items: [] },
        }
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => sections })
        const res = await api.updateSections(sections)
        expect(res).toEqual(sections)

        const content = { posts: [], profile: {}, sections }
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => content })
        const r2 = await api.resetContent()
        expect(r2).toEqual(content)
    })

    it('fetchCurrentUser and updateSite', async () => {
        const user = { email: 'u@x' }
        ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => user })
        const got = await api.fetchCurrentUser()
        expect(got).toEqual(user)

    const site = { title: 'site', description: 'd', homeButtonMode: 'text' as const, logo: null }
    ; (globalThis.fetch as unknown as Mock).mockResolvedValueOnce({ ok: true, json: async () => site })
    const updated = await api.updateSite(site)
    expect(updated).toEqual(site)
    })
})
