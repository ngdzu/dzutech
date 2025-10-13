import { render, screen, cleanup } from '@testing-library/react'
import { beforeEach, beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest'
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

// Provide safe no-op globals for test environment to avoid unhandled errors
// during teardown (some DOM APIs may not be implemented or may be removed
// while async React work is still running). We restore originals after tests.
let _origScrollTo: unknown
let _origIntersectionObserver: unknown

type GlobalScroll = { scrollTo?: (...args: unknown[]) => void }
type GlobalIO = { IntersectionObserver?: typeof IntersectionObserver }

beforeAll(() => {
    const gScroll = globalThis as unknown as GlobalScroll
    _origScrollTo = gScroll.scrollTo
    if (typeof gScroll.scrollTo !== 'function') {
        gScroll.scrollTo = () => {}
    }

    const gIO = globalThis as unknown as GlobalIO
    _origIntersectionObserver = gIO.IntersectionObserver
    if (typeof gIO.IntersectionObserver !== 'function') {
        class MockIntersectionObserver {
            constructor(_cb?: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {
                // reference args to avoid unused var lint
                void _cb
                void _opts
            }
            observe(_el: Element) {
                void _el
            }
            unobserve(_el: Element) {
                void _el
            }
            disconnect() {
                return
            }
        }
        // Cast via unknown to avoid using `any` while satisfying the global type.
        gIO.IntersectionObserver = MockIntersectionObserver as unknown as GlobalIO['IntersectionObserver']
    }
})

afterAll(() => {
    const gScroll = globalThis as unknown as GlobalScroll
    gScroll.scrollTo = _origScrollTo as GlobalScroll['scrollTo']
    const gIO = globalThis as unknown as GlobalIO
    gIO.IntersectionObserver = _origIntersectionObserver as GlobalIO['IntersectionObserver']
})

afterEach(() => {
    // Ensure DOM is cleaned up between tests and restore mocks/spies.
    cleanup()
    vi.restoreAllMocks()
})

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
