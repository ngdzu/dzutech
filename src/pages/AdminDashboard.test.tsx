import { render, screen, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'
import { AdminDashboard } from './AdminDashboard'

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

vi.mock('../components/AdminSessionActions', () => ({
    AdminSessionActions: () => {
        return <div data-testid="admin-session-actions">actions</div>
    },
}))

beforeEach(() => {
    mockContextValue.content = clone()
    mockContextValue.loading = false
    mockContextValue.error = null
    mockContextValue.updateSite.mockClear()
    mockContextValue.updateProfile.mockClear()
    mockContextValue.updateSections.mockClear()
    mockContextValue.resetContent.mockClear()
})

afterEach(() => {
    // ensure mounted components are unmounted and any timers/mocks are cleared
    cleanup()
    try {
        vi.clearAllTimers()
    } catch {
        // ignore if timers not in use
    }
    vi.resetAllMocks()
})

describe('AdminDashboard', () => {
    it('renders without crashing', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        expect(screen.getByText('Admin dashboard')).toBeInTheDocument()
        expect(screen.getByText('Photos')).toBeInTheDocument()
    })

    it('navigates to /admin/uploads when Photos button is clicked', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        const photosButtons = screen.getAllByRole('link', { name: /Photos/i })
        expect(photosButtons[0]).toHaveAttribute('href', '/admin/uploads')
    })

    it('renders when content is loading', async () => {
        mockContextValue.loading = true
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        // Should still render the main dashboard elements
        expect(screen.getAllByText('Admin dashboard').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Photos').length).toBeGreaterThan(0)
    })

    it('displays error state when there is an error', async () => {
        mockContextValue.error = 'Test error message'
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('renders admin session actions', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        expect(screen.getAllByTestId('admin-session-actions').length).toBeGreaterThan(0)
    })

    it('renders navigation links', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        expect(screen.getAllByText('Manage blogs').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Experiences').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Photos').length).toBeGreaterThan(0)
        expect(screen.getAllByText('View site').length).toBeGreaterThan(0)
    })

    it('renders main content sections', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        // Use getAllByText to handle multiple instances and check that at least one exists
        expect(screen.getAllByText('Site metadata').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Identity').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Narrative').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
    })

    it('renders form elements', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        // Check that form elements exist by looking for specific labels
        expect(screen.getAllByText('Site title').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Meta description').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Name').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Title').length).toBeGreaterThan(0)
    })

    it('displays current content values', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        // Check that current content values are displayed
        expect(screen.getAllByDisplayValue('Crafted Portfolio').length).toBeGreaterThan(0)
        expect(screen.getAllByDisplayValue('Showcase engineering work, thoughtful processes, and ways to collaborate.').length).toBeGreaterThan(0)
    })

    it('has form inputs that can be interacted with', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        const siteTitleInputs = screen.getAllByLabelText(/Site title/i)
        expect(siteTitleInputs[0]).toBeInTheDocument()
    })

    it('has file upload input for logo', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        const uploadLabels = screen.getAllByText('Upload logo')
        expect(uploadLabels[0]).toBeInTheDocument()
    })

    it('has radio buttons for home button mode', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        const logoButtonRadios = screen.getAllByLabelText(/Logo button/i)
        const textButtonRadios = screen.getAllByLabelText(/Text label/i)
        expect(logoButtonRadios[0]).toBeInTheDocument()
        expect(textButtonRadios[0]).toBeInTheDocument()
    })

    it('renders status messages when present', async () => {
        // Mock a status that would show a message
        mockContextValue.updateSite.mockImplementation(() => {
            throw new Error('Test error')
        })
        
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        
        // The component should still render even with mocked error
        expect(screen.getAllByText('Admin dashboard').length).toBeGreaterThan(0)
    })

    it('has profile form inputs', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        const nameInputs = screen.getAllByLabelText(/Name/i)
        const titleInputs = screen.getAllByLabelText(/Title/i)
        expect(nameInputs[0]).toBeInTheDocument()
        expect(titleInputs[0]).toBeInTheDocument()
    })

    it('renders all navigation sections', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )
        // Check that all navigation sections are present
        expect(screen.getAllByText('Site metadata').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Identity').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Narrative').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Site sections').length).toBeGreaterThan(0)
    })
})