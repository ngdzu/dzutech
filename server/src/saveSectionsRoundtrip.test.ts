/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

// Provide a stateful mock for db.js so writeJson stores values and readJson returns them.
vi.mock('./db.js', () => {
    const store: Record<string, unknown> = {}
    const writeJson = vi.fn(async (key: string, value: unknown) => {
        store[key] = value
    })
    const readJson = vi.fn(async (key: string) => store[key])
        // expose the store/mocks for optional assertions
        ; (globalThis as any).__mockDbStore = store
        ; (globalThis as any).__mockWriteJson = writeJson
        ; (globalThis as any).__mockReadJson = readJson

    return { writeJson, readJson }
})

import { saveSections, getContent } from './repository.js'

describe('saveSections roundtrip', () => {
    it('writes sections and getContent returns the saved value', async () => {
        const payload = {
            contact: { description: 'Reach me at roundtrip@example.com' },
            educations: { visible: true, items: [{ institution: 'Round U', degree: 'BS', year: '2010', description: 'RT' }] },
            programmingLanguages: { visible: true, items: ['TypeScript', 'Rust'] },
            languagesSpoken: { visible: true, items: ['English'] },
            achievements: { visible: true, items: ['Roundtrip done'] },
            experiencesPage: { visible: false },
        }

        const saved = await saveSections(payload as unknown as any)
        expect(saved).toEqual(payload)

        const content = await getContent()
        // Confirm that the sections returned by getContent include values we saved
        expect(content).toHaveProperty('sections')
        const sections = content.sections as any
        expect(sections.contact).toBeDefined()
        expect(sections.contact.description).toBe('Reach me at roundtrip@example.com')
        expect(sections.programmingLanguages.items).toEqual(['TypeScript', 'Rust'])
        expect(sections.achievements.items).toContain('Roundtrip done')
    })
})
