import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'

const clone = () => JSON.parse(JSON.stringify(defaultContent))

type MockContent = {
    content: typeof defaultContent
    loading: boolean
    error: null | string
    refresh: ReturnType<typeof vi.fn>
    updateSite: ReturnType<typeof vi.fn>
    updateProfile: ReturnType<typeof vi.fn>
    updatePosts: ReturnType<typeof vi.fn>
    updateExperiences: ReturnType<typeof vi.fn>
    updateSections: ReturnType<typeof vi.fn>
    resetContent: ReturnType<typeof vi.fn>
}

const mockContextValue: MockContent = {
    content: clone(),
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateSite: vi.fn(),
    updateProfile: vi.fn(),
    updatePosts: vi.fn(),
    updateExperiences: vi.fn(),
    updateSections: vi.fn(async (s: unknown) => s),
    resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
    useContent: () => mockContextValue,
}))

// Mock the admin session actions (they use AuthContext) to avoid providing AuthProvider in tests
vi.mock('../components/AdminSessionActions', () => ({
    AdminSessionActions: () => {
        return <div data-testid="admin-session-actions">actions</div>
    },
}))

beforeEach(() => {
    mockContextValue.content = clone()
    mockContextValue.updateSections = vi.fn(async (s: unknown) => s)
})

describe('AdminDashboard sections editor', () => {
    it('edits contact, adds education and programming language, and submits payload', async () => {
        const { AdminDashboard } = await import('./AdminDashboard')

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        // Update contact description
        const contactTextarea = screen.getByLabelText('Contact section description')
        fireEvent.change(contactTextarea, { target: { value: 'Reach out via email' } })

        // Add an education entry
        const addEduButton = screen.getByText('Add education')
        fireEvent.click(addEduButton)

        // Fill institution input inside the education block
        const eduInstitution = screen.getByPlaceholderText('Institution')
        fireEvent.change(eduInstitution, { target: { value: 'Test University' } })

        // Add a programming language (the first 'Add language' button targets programming languages)
        const addLangBtns = screen.getAllByText('Add language')
        const addLangBtn = addLangBtns[0]
        fireEvent.click(addLangBtn)
        // Fill the new programming language input (find inputs relative to the "Add language" button)
        const addLangBtnContainer = addLangBtn.closest('div')!
        const plSection = addLangBtnContainer.parentElement!

        // Wait for the new input to be added to the DOM after clicking "Add language"
        await waitFor(() => Array.from(plSection.querySelectorAll('input')).filter((i) => i.type !== 'checkbox').length > 0)

        // querySelectorAll to find inputs and exclude any checkboxes
        const plInputsNodeList = Array.from(plSection.querySelectorAll('input')).filter((i) => i.type !== 'checkbox')
        const plInputs = plInputsNodeList as HTMLInputElement[]
        const lastPlInput = plInputs[plInputs.length - 1]
        fireEvent.change(lastPlInput, { target: { value: 'TypeScript' } })

        // Wait for the input value to be reflected in the DOM / component state
        await waitFor(() => expect(lastPlInput.value).toBe('TypeScript'))

        // Submit the sections form
        const saveButton = screen.getByRole('button', { name: /Save section copy/i })
        fireEvent.click(saveButton)

        await waitFor(() => expect(mockContextValue.updateSections).toHaveBeenCalled())

        const calledWithRaw = (mockContextValue.updateSections as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]
        const calledWith = calledWithRaw as unknown as import('../content').SectionsContent
        expect(calledWith).toHaveProperty('contact')
        expect(calledWith.contact.description).toBe('Reach out via email')
        expect(calledWith).toHaveProperty('educations')
        if (calledWith.educations) {
            expect(Array.isArray(calledWith.educations.items)).toBe(true)
            expect(calledWith.educations.items[0].institution).toBe('Test University')
        }
        expect(calledWith).toHaveProperty('programmingLanguages')
        if (calledWith.programmingLanguages) {
            expect(calledWith.programmingLanguages.items).toContain('TypeScript')
        }
    })
})
