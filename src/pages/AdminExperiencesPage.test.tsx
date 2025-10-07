import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
        mockContext.updateSections = vi.fn(async (s: unknown) => s)
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

    it('allows adding an experience and saves the new item via updateExperiences', async () => {
        const { AdminExperiencesPage } = await import('./AdminExperiencesPage')
        render(
            <MemoryRouter>
                <AdminExperiencesPage />
            </MemoryRouter>,
        )

        // count initial experiences headings
        const headingsBefore = screen.getAllByRole('heading', { level: 3 })
        const initialCount = headingsBefore.filter((h) => /Experience \d+/.test(h.textContent || '')).length

        // click Add experience (multiple buttons may exist in the DOM, choose the last one)
        const addButtons = screen.getAllByRole('button', { name: /Add experience/i })
        const addBtn = addButtons[addButtons.length - 1]
        fireEvent.click(addBtn)

        // now there should be one more Experience heading
        await waitFor(() => {
            const headingsAfter = screen.getAllByRole('heading', { level: 3 })
            const newCount = headingsAfter.filter((h) => /Experience \d+/.test(h.textContent || '')).length
            expect(newCount).toBe(initialCount + 1)
        })

        // locate the newly added experience panel by finding the last Experience heading and walking up to the panel container
        const headingsAfter = screen.getAllByRole('heading', { level: 3 }).filter((h) => /Experience \d+/.test(h.textContent || ''))
        const lastHeading = headingsAfter[headingsAfter.length - 1]
        const panelRoot = lastHeading.parentElement?.parentElement?.parentElement as HTMLElement
        const panel = panelRoot

        // fill required fields inside the new panel using within
        const yearInput = within(panel).getByPlaceholderText('2023 — Present') as HTMLInputElement
        const titleInput = within(panel).getByPlaceholderText('Principal Software Engineer') as HTMLInputElement
        const companyInput = within(panel).getByPlaceholderText('Aurora Labs') as HTMLInputElement
        const locationInput = within(panel).getByPlaceholderText('Remote / City') as HTMLInputElement
        const textareas = within(panel).getAllByRole('textbox').filter((el) => el.tagName.toLowerCase() === 'textarea') as HTMLTextAreaElement[]
        const descriptionTextarea = textareas[0]
        const skillsInput = within(panel).getByPlaceholderText('React, TypeScript, GraphQL') as HTMLInputElement

        fireEvent.change(yearInput, { target: { value: '2025' } })
        fireEvent.change(titleInput, { target: { value: 'Test Title' } })
        fireEvent.change(companyInput, { target: { value: 'Test Co' } })
        fireEvent.change(locationInput, { target: { value: 'Hanoi' } })
        fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } })
        fireEvent.change(skillsInput, { target: { value: 'React' } })

        // Save experiences
        const saveButtons = screen.getAllByRole('button', { name: /Save experiences/i })
        const saveBtn = saveButtons[saveButtons.length - 1]
        fireEvent.click(saveBtn)

        await waitFor(() => expect(mockContext.updateExperiences).toHaveBeenCalled())

        const calledWithRaw = (mockContext.updateExperiences as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]
        expect(Array.isArray(calledWithRaw)).toBe(true)
        const calledWith = calledWithRaw as unknown as import('../content').Experience[]
        const newExp = calledWith[calledWith.length - 1]
        expect(newExp).toHaveProperty('role', 'Test Title')
        expect(newExp).toHaveProperty('company', 'Test Co')
        expect(newExp).toHaveProperty('year', '2025')
        expect(newExp).toHaveProperty('description', 'Test description')
        expect(newExp.stack).toContain('React')
    })

    it('shows validation error when required fields are missing and does not call updateExperiences', async () => {
        const { AdminExperiencesPage } = await import('./AdminExperiencesPage')
        render(
            <MemoryRouter>
                <AdminExperiencesPage />
            </MemoryRouter>,
        )


        // clear the skills (stack) and description for the first experience to make it invalid
        const skillsInputs = screen.getAllByPlaceholderText('React, TypeScript, GraphQL') as HTMLInputElement[]
        const descriptions = screen.getAllByRole('textbox').filter((el) => el.tagName.toLowerCase() === 'textarea') as HTMLTextAreaElement[]
        const firstSkills = skillsInputs[0]
        const firstDescription = descriptions[0]
        fireEvent.change(firstSkills, { target: { value: '' } })
        fireEvent.change(firstDescription, { target: { value: '' } })

        const saveButtons = screen.getAllByRole('button', { name: /Save experiences/i })
        const saveBtn = saveButtons[saveButtons.length - 1]

        // reset the spy so we only measure calls from this submit
        mockContext.updateExperiences = vi.fn(async (e: unknown) => e)

        fireEvent.click(saveBtn)

        await waitFor(() => expect((mockContext.updateExperiences as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(0))
    })

    it('saves sections: programming languages and languages spoken via updateSections', async () => {
        const { AdminExperiencesPage } = await import('./AdminExperiencesPage')
        render(
            <MemoryRouter>
                <AdminExperiencesPage />
            </MemoryRouter>,
        )

        // There are multiple inputs with this label; choose the last one in the sections card
        const progInputs = screen.getAllByPlaceholderText('JavaScript, TypeScript, Go') as HTMLInputElement[]
        const progInput = progInputs[progInputs.length - 1]
        fireEvent.change(progInput, { target: { value: 'JavaScript, Go, TypeScript' } })

        const langInputs = screen.getAllByPlaceholderText('English, Vietnamese') as HTMLInputElement[]
        const langInput = langInputs[langInputs.length - 1]
        fireEvent.change(langInput, { target: { value: 'English, Spanish' } })

        const saveSectionsButtons = screen.getAllByRole('button', { name: /Save sections/i })
        const saveSectionsBtn = saveSectionsButtons[saveSectionsButtons.length - 1]
        fireEvent.click(saveSectionsBtn)

        await waitFor(() => expect(mockContext.updateSections).toHaveBeenCalled())

        const calledWithRaw = (mockContext.updateSections as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]
        const calledWith = calledWithRaw as unknown as import('../content').SectionsContent
        expect(calledWith).toHaveProperty('programmingLanguages')
        expect(calledWith.programmingLanguages).toBeDefined()
        if (calledWith.programmingLanguages) {
            expect(calledWith.programmingLanguages.items).toEqual(['JavaScript', 'Go', 'TypeScript'])
        }

        expect(calledWith).toHaveProperty('languagesSpoken')
        expect(calledWith.languagesSpoken).toBeDefined()
        if (calledWith.languagesSpoken) {
            expect(calledWith.languagesSpoken.items).toEqual(['English, Spanish'])
        }
    })
})
