import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
        expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument()
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
                <AdminDashboard testActiveSection="profile-identity" />
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

    it('submits profile form successfully', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard testActiveSection="profile-identity" />
            </MemoryRouter>,
        )

        const nameInput = screen.getAllByLabelText(/Name/i)[0]
        await user.clear(nameInput)
        await user.type(nameInput, 'Updated Name')

        const submitButton = screen.getByRole('button', { name: /Save changes/i })
        await user.click(submitButton)

        expect(mockContextValue.updateProfile).toHaveBeenCalledWith({
            name: 'Updated Name',
            title: 'Software Engineer',
            tagline: 'I build reliable digital products with thoughtful, human-centered experiences.',
            summary: 'I help product teams design, ship, and scale resilient web applications across the stack.',
            location: 'Remote · Worldwide',
            email: 'hello@example.com',
            social: {
                linkedin: 'https://www.linkedin.com/in/your-profile',
                github: 'https://github.com/your-handle',
            },
            contactVisibility: {
                email: true,
                linkedin: true,
                github: true,
            },
            highlightsEnabled: true,
            availability: {
                value: 'Open to mentoring & advisory work',
                enabled: true,
            },
            focusAreas: {
                value: 'Platform architecture · Developer experience · Applied AI',
                enabled: true,
            },
        })
    })

    it('shows error when profile form submission fails', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockRejectedValue(new Error('Save failed'))

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save changes/i })
        await user.click(submitButton)

        expect(screen.getByText('Save failed')).toBeInTheDocument()
    })

    it('validates profile form fields', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        // Clear location and try to submit with highlights enabled
        const locationInput = screen.getAllByLabelText(/Location/i)[0]
        await user.clear(locationInput)

        const submitButton = screen.getByRole('button', { name: /Save changes/i })
        await user.click(submitButton)

        expect(screen.getByText('Location is required when highlights are visible')).toBeInTheDocument()
        expect(mockContextValue.updateProfile).not.toHaveBeenCalled()
    })

    it('submits site form successfully', async () => {
        const user = userEvent.setup()
        mockContextValue.updateSite.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const titleInput = screen.getAllByLabelText(/Site title/i)[0]
        await user.clear(titleInput)
        await user.type(titleInput, 'Updated Site Title')

        const submitButton = screen.getByRole('button', { name: /Save site metadata/i })
        await user.click(submitButton)

        expect(mockContextValue.updateSite).toHaveBeenCalledWith({
            title: 'Updated Site Title',
            description: 'Showcase engineering work, thoughtful processes, and ways to collaborate.',
            homeButtonMode: 'text',
            logo: null,
        })
    })

    it('shows error when site form submission fails', async () => {
        const user = userEvent.setup()
        mockContextValue.updateSite.mockRejectedValue(new Error('Site save failed'))

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save site metadata/i })
        await user.click(submitButton)

        expect(screen.getByText('Site save failed')).toBeInTheDocument()
    })

    it('validates site form fields', async () => {
        const user = userEvent.setup()
        mockContextValue.updateSite.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        // Clear required fields
        const titleInput = screen.getAllByLabelText(/Site title/i)[0]
        const descriptionInput = screen.getAllByLabelText(/Meta description/i)[0]
        await user.clear(titleInput)
        await user.clear(descriptionInput)

        const submitButton = screen.getByRole('button', { name: /Save site metadata/i })
        await user.click(submitButton)

        expect(screen.getByText('Title and description are required')).toBeInTheDocument()
        expect(mockContextValue.updateSite).not.toHaveBeenCalled()
    })

    it('submits sections form successfully', async () => {
        const user = userEvent.setup()
        mockContextValue.updateSections.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save section copy/i })
        await user.click(submitButton)

        expect(mockContextValue.updateSections).toHaveBeenCalledWith({
            contact: {
                description: 'I partner with founders, product leaders, and engineering teams to untangle complex systems, accelerate delivery, and coach developers. Drop a note and let’s explore how we can collaborate.',
            },
            experiencesPage: { visible: true },
            educations: {
                visible: true,
                items: [],
            },
            programmingLanguages: {
                visible: true,
                items: [],
            },
            languagesSpoken: {
                visible: true,
                items: [],
            },
            achievements: {
                visible: true,
                items: [],
            },
        })
    })

    it('shows error when sections form submission fails', async () => {
        const user = userEvent.setup()
        mockContextValue.updateSections.mockRejectedValue(new Error('Sections save failed'))

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save section copy/i })
        await user.click(submitButton)

        expect(screen.getByText('Sections save failed')).toBeInTheDocument()
    })

    it('resets content successfully', async () => {
        const user = userEvent.setup()
        mockContextValue.resetContent.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const resetButton = screen.getByRole('button', { name: /Restore defaults/i })
        await user.click(resetButton)

        expect(mockContextValue.resetContent).toHaveBeenCalled()
    })

    it('shows error when reset fails', async () => {
        const user = userEvent.setup()
        mockContextValue.resetContent.mockRejectedValue(new Error('Reset failed'))

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const resetButton = screen.getByRole('button', { name: /Restore defaults/i })
        await user.click(resetButton)

        expect(screen.getAllByText('Reset failed')).toHaveLength(3)
    })

    it('updates profile form inputs on change', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const nameInput = screen.getAllByLabelText(/Name/i)[0]
        await user.clear(nameInput)
        await user.type(nameInput, 'New Name')

        expect(nameInput).toHaveValue('New Name')
    })

    it('updates site form inputs on change', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const titleInput = screen.getAllByLabelText(/Site title/i)[0]
        await user.clear(titleInput)
        await user.type(titleInput, 'New Site Title')

        expect(titleInput).toHaveValue('New Site Title')
    })

    it('toggles highlights enabled checkbox', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <AdminDashboard testActiveSection="profile-narrative" />
            </MemoryRouter>,
        )

        const highlightsCheckbox = screen.getByLabelText(/Show highlights/i)
        expect(highlightsCheckbox).toBeChecked()

        await user.click(highlightsCheckbox)
        expect(highlightsCheckbox).not.toBeChecked()
    })

    it('toggles contact visibility checkboxes', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <AdminDashboard testActiveSection="profile-contact" />
            </MemoryRouter>,
        )

        const emailCheckbox = screen.getByLabelText(/Show email/i)
        const linkedinCheckbox = screen.getByLabelText(/Show LinkedIn/i)
        const githubCheckbox = screen.getByLabelText(/Show GitHub/i)

        expect(emailCheckbox).toBeChecked()
        expect(linkedinCheckbox).toBeChecked()
        expect(githubCheckbox).toBeChecked()

        await user.click(emailCheckbox)
        expect(emailCheckbox).not.toBeChecked()
    })

    it('changes home button mode radio buttons', async () => {
        const user = userEvent.setup()

        // Set up a logo so the logo radio button is enabled
        mockContextValue.content.site.logo = {
            data: 'data:image/png;base64,test',
            type: 'image/png',
            alt: 'Test logo'
        }

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const logoRadio = screen.getByLabelText(/Logo button/i)
        const textRadio = screen.getByLabelText(/Text label/i)

        expect(textRadio).toBeChecked()
        expect(logoRadio).not.toBeChecked()

        await user.click(logoRadio)
        expect(logoRadio).toBeChecked()
        expect(textRadio).not.toBeChecked()
    })

    it('updates logo alt text input', async () => {
        const user = userEvent.setup()

        // Set up a logo in the form state
        mockContextValue.content.site.logo = {
            data: 'data:image/png;base64,test',
            type: 'image/png',
            alt: 'Original alt',
        }

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const altInput = screen.getByLabelText(/Logo alt text/i)
        await user.clear(altInput)
        await user.type(altInput, 'New alt text')

        expect(altInput).toHaveValue('New alt text')
    })

    it('updates sections form inputs on change', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <AdminDashboard testActiveSection="site-sections" />
            </MemoryRouter>,
        )

        const contactDescriptionTextarea = screen.getByLabelText(/Contact section description/i)
        await user.clear(contactDescriptionTextarea)
        await user.type(contactDescriptionTextarea, 'New contact description')

        expect(contactDescriptionTextarea).toHaveValue('New contact description')
    })

    it('uploads valid logo file successfully', async () => {
        const user = userEvent.setup()
        const file = new File(['test'], 'test.png', { type: 'image/png' })
        Object.defineProperty(file, 'size', { value: 1024 })

        // Mock FileReader
        const mockFileReader = {
            readAsDataURL: vi.fn(),
            onload: null as EventListener | null,
            onerror: null as EventListener | null,
            result: 'data:image/png;base64,testdata',
        }
        globalThis.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const fileInput = screen.getByLabelText(/Upload logo/i)
        await user.upload(fileInput, file)

        // Trigger the onload event
        mockFileReader.onload?.({ target: { result: 'data:image/png;base64,testdata' } } as ProgressEvent<FileReader>)
    })

    it('rejects logo files that are too large', async () => {
        const user = userEvent.setup()
        const largeFile = new File(['x'.repeat(600 * 1024)], 'large.png', { type: 'image/png' })

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const fileInput = screen.getByLabelText(/Upload logo/i)
        await user.upload(fileInput, largeFile)

        expect(screen.getByText('Logo must be smaller than 512KB')).toBeInTheDocument()
    })

    it('rejects invalid logo file types', async () => {
        const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const fileInput = screen.getByLabelText(/Upload logo/i)
        fireEvent.change(fileInput, { target: { files: [invalidFile] } })

        await waitFor(() => {
            expect(screen.getByText('Logo must be PNG, SVG, JPG, or WEBP')).toBeInTheDocument()
        })
    })

    it('clears logo when remove button is clicked', async () => {
        const user = userEvent.setup()

        // Set up a logo in the form state
        mockContextValue.content.site.logo = {
            data: 'data:image/png;base64,test',
            type: 'image/png',
            alt: 'Test logo',
        }

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const removeButton = screen.getByRole('button', { name: /Remove/i })
        await user.click(removeButton)

        // The logo should be cleared from the form state
        // The remove button should no longer be present since it only shows when there's a logo
        expect(removeButton).not.toBeInTheDocument()
    })

    it('handles logo upload read error', async () => {
        const user = userEvent.setup()
        const file = new File(['test'], 'test.png', { type: 'image/png' })

        // Mock FileReader to fail
        const mockFileReader = {
            readAsDataURL: vi.fn(),
            onload: null,
            onerror: vi.fn(),
        }
        globalThis.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const fileInput = screen.getByLabelText(/Upload logo/i)
        await user.upload(fileInput, file)

        // Simulate FileReader error
        mockFileReader.onerror()

        await screen.findByText('Unable to read logo file')
    })

    it('displays saving status messages', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockImplementation(() => new Promise(() => {})) // Never resolves

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save changes/i })
        await user.click(submitButton)

        expect(screen.getAllByText('Saving profile...').length).toBeGreaterThan(0)
    })

    it('displays saved status messages', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const submitButton = screen.getByRole('button', { name: /Save changes/i })
        await user.click(submitButton)

        // Wait for the saved message to appear (it shows after a delay)
        await new Promise(resolve => setTimeout(resolve, 100))
        expect(screen.getAllByText('Profile updated').length).toBeGreaterThan(0)
    })

    it('displays resetting status messages', async () => {
        const user = userEvent.setup()
        mockContextValue.resetContent.mockImplementation(() => new Promise(() => {})) // Never resolves

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const resetButton = screen.getByRole('button', { name: /Restore defaults/i })
        await user.click(resetButton)

        expect(screen.getAllByText('Restoring defaults...').length).toBeGreaterThan(0)
    })

    it('displays reset status messages', async () => {
        const user = userEvent.setup()
        mockContextValue.resetContent.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const resetButton = screen.getByRole('button', { name: /Restore defaults/i })
        await user.click(resetButton)

        // Wait for the reset message to appear (it shows after a delay)
        await new Promise(resolve => setTimeout(resolve, 100))
        expect(screen.getAllByText('Defaults restored').length).toBeGreaterThan(0)
    })

    it('displays multiple status messages simultaneously', async () => {
        const user = userEvent.setup()
        mockContextValue.updateProfile.mockResolvedValue(undefined)
        mockContextValue.updateSite.mockResolvedValue(undefined)

        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>,
        )

        const profileSubmitButton = screen.getByRole('button', { name: /Save changes/i })
        const siteSubmitButton = screen.getByRole('button', { name: /Save site metadata/i })

        await user.click(profileSubmitButton)
        await user.click(siteSubmitButton)

        // Wait for messages to appear
        await new Promise(resolve => setTimeout(resolve, 100))
        expect(screen.getAllByText('Profile updated').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Site metadata updated').length).toBeGreaterThan(0)
    })
})