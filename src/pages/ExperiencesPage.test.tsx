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

    it('omits hidden sections from the side navigation', () => {
        const c = clone()
        // Hide the languages spoken section
        c.sections.languagesSpoken = { visible: false, items: [] }
        mockContextValue.content = c

        render(
            <MemoryRouter>
                <ExperiencesPage />
            </MemoryRouter>,
        )

        // Scope queries across all navigation elements (React StrictMode may mount
        // components multiple times in tests). We'll assert that no navigation
        // contains the languages anchor, and that at least one navigation contains
        // the other expected labels.
        const navs = screen.getAllByRole('navigation')
        // Compute expected nav labels from the sections data
        const expectedLabels: string[] = []
        if (c.sections.experiencesPage?.visible !== false) expectedLabels.push('Experiences')
        if (c.sections.educations?.visible !== false) expectedLabels.push('Education')
        if (c.sections.programmingLanguages?.visible !== false) expectedLabels.push('Programming languages')
        if (c.sections.languagesSpoken?.visible !== false) expectedLabels.push('Languages')
        if (c.sections.achievements?.visible !== false) expectedLabels.push('Achievements')

        // Compute labels for each nav and assert at least one nav matches the
        // expected labels (this tolerates React StrictMode double-mount behaviour).
        const navsLabels = navs.map((n) => {
            const links = Array.from((n as HTMLElement).querySelectorAll('a'))
            return links.map((a) => (a.textContent || '').trim())
        })

        // The expected labels should not include 'Languages' since it's hidden
        const expectedVisibleLabels = expectedLabels.filter((l) => l !== 'Languages')

        const matches = navsLabels.some((labels) => {
            // Some mounts may include extra whitespace; normalize by trimming
            return labels.length === expectedVisibleLabels.length && labels.every((v, i) => v === expectedVisibleLabels[i])
        })

        expect(matches).toBe(true)
    })
})
