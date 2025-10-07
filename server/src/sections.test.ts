/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

const fakeSections = {
    contact: { description: 'Contact me' },
    educations: { visible: true, items: [{ institution: 'U of Test', degree: 'BS', year: '2010' }] },
    programmingLanguages: { visible: true, items: ['TypeScript', 'Rust'] },
    languagesSpoken: { visible: true, items: ['English'] },
    achievements: { visible: true, items: ['Won award'] },
}

describe('sections persistence', () => {
    it('preserves custom nested fields when reading content', async () => {
        // Mock db module before importing repository to avoid real pg dependency during test runtime
        vi.mock('./db.js', () => ({
            readJson: async (key: string) => (key === 'sections' ? (fakeSections as unknown) : undefined),
            writeJson: async () => undefined,
        }))

        // Import repository after mock
        const repo = await import('./repository.js')

        const content = await repo.getContent()

        expect(content.sections).toBeDefined()
        // access optional keys safely
        expect((content.sections as any).educations).toBeDefined()
        expect((content.sections as any).programmingLanguages.items).toContain('TypeScript')
        expect((content.sections as any).languagesSpoken.items).toContain('English')
        expect((content.sections as any).achievements.items).toContain('Won award')
    })
})
