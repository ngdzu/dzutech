/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

// Mock db.js before importing repository to avoid real DB dependencies (pg)
vi.mock('./db.js', () => {
    const writeJson = vi.fn(async () => undefined)
    const readJson = vi.fn(async () => undefined)
        // expose mocks for assertions
        ; (globalThis as any).__mockWriteJson = writeJson
        ; (globalThis as any).__mockReadJson = readJson
    return { writeJson, readJson }
})

import { saveSections } from './repository.js'

describe('saveSections', () => {
    it('writes nested sections payload to storage and returns it', async () => {
        const payload = {
            contact: { description: 'Reach me' },
            educations: { visible: true, items: [{ institution: 'Test U', degree: 'MS', year: '2015', description: 'Testing' }] },
            programmingLanguages: { visible: true, items: ['TypeScript', 'Go'] },
            languagesSpoken: { visible: true, items: ['English', 'Spanish'] },
            achievements: { visible: true, items: ['Contributor Award'] },
            experiencesPage: { visible: false },
        }

        const result = await saveSections(payload as unknown as any)

        expect((globalThis as any).__mockWriteJson).toHaveBeenCalledTimes(1)
        expect((globalThis as any).__mockWriteJson).toHaveBeenCalledWith('sections', payload)
        expect(result).toEqual(payload)
    })
})
