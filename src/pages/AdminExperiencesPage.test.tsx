import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'

const clone = () => JSON.parse(JSON.stringify(defaultContent))

const mockContext = {
    content: clone(),
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateSite: vi.fn(),
    updateProfile: vi.fn(),
    updatePosts: vi.fn(),
    updateExperiences: vi.fn(async (e: unknown) => e),
    updateSections: vi.fn(async (s: unknown) => s),
    resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
    useContent: () => mockContext,
}))

vi.mock('../components/AdminSessionActions', () => ({
    AdminSessionActions: () => <div data-testid="admin-session-actions">actions</div>,
}))

describe('AdminExperiencesPage', () => {
    beforeEach(() => {
        mockContext.content = clone()
        mockContext.updateExperiences = vi.fn(async (e: unknown) => e)
    })

    it('allows editing location and saves it via updateExperiences', async () => {
        const { AdminExperiencesPage } = await import('./AdminExperiencesPage')
        render(
            <MemoryRouter>
                <AdminExperiencesPage />
            </MemoryRouter>,
        )

        // find the first location input
        const locationInputs = screen.getAllByPlaceholderText('Remote / City')
        expect(locationInputs.length).toBeGreaterThan(0)
        const firstLocation = locationInputs[0] as HTMLInputElement

        fireEvent.change(firstLocation, { target: { value: 'Hanoi, Vietnam' } })
        await waitFor(() => expect(firstLocation.value).toBe('Hanoi, Vietnam'))

        // click Save experiences
        const saveBtn = screen.getByRole('button', { name: /Save experiences/i })
        fireEvent.click(saveBtn)

        await waitFor(() => expect(mockContext.updateExperiences).toHaveBeenCalled())

        const calledWithRaw = (mockContext.updateExperiences as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]
        expect(Array.isArray(calledWithRaw)).toBe(true)
        const calledWith = calledWithRaw as unknown as import('../content').Experience[]
        const first = calledWith[0]
        expect(first).toHaveProperty('location')
        expect(first.location).toBe('Hanoi, Vietnam')
    })
})
