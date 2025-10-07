import { render, screen } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'
import ExperiencesPage from './ExperiencesPage'

const clone = () => JSON.parse(JSON.stringify(defaultContent))

const mockContextValue = {
    content: clone(),
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateSite: vi.fn(),
    updateProfile: vi.fn(),
    updatePosts: vi.fn(),
    updateExperiences: vi.fn(),
    updateSections: vi.fn(),
    resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
    useContent: () => mockContextValue,
}))

beforeEach(() => {
    mockContextValue.content = clone()
})

describe('ExperiencesPage', () => {
    it('renders experiences and sections', () => {
        render(
            <MemoryRouter>
                <ExperiencesPage />
            </MemoryRouter>,
        )

        const headings = screen.getAllByRole('heading', { name: /Experiences/i })
        expect(headings.length).toBeGreaterThan(0)
        // Default content has 3 experiences
        expect(screen.getByText(/Aurora Labs/)).toBeInTheDocument()
    })

    it('renders gracefully when sections arrays are empty', () => {
        const c = clone()
        c.experiences = []
        c.sections.educations = { visible: true, items: [] }
        c.sections.programmingLanguages = { visible: true, items: [] }
        c.sections.languagesSpoken = { visible: true, items: [] }
        c.sections.achievements = { visible: true, items: [] }
        mockContextValue.content = c

        render(
            <MemoryRouter>
                <ExperiencesPage />
            </MemoryRouter>,
        )

        const headings2 = screen.getAllByRole('heading', { name: /Experiences/i })
        expect(headings2.length).toBeGreaterThan(0)
    })
})
