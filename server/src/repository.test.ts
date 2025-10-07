import { describe, it, expect, vi } from 'vitest'

vi.mock('./db.js', () => ({
    readJson: vi.fn(async (key: string) => {
        if (key === 'experiences') {
            return [
                {
                    role: 'Tester',
                    company: 'TestCo',
                    year: '2025',
                    description: 'Testing location persistence',
                    achievements: ['Did things'],
                    stack: ['TS'],
                    location: 'Test City',
                },
            ]
        }
        return undefined
    }),
    writeJson: vi.fn(),
}))

import { getContent } from './repository.js'

describe('repository getContent', () => {
    it('preserves location field for experiences loaded from storage', async () => {
        const content = await getContent()
        expect(content.experiences[0].location).toBe('Test City')
    })
})
