import { render, screen, within } from '@testing-library/react'
import { type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'
import { LandingPage } from './LandingPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
      <span data-router-link={to} className={className} role="link">
        {children}
      </span>
    ),
  }
})

const cloneContent = () => JSON.parse(JSON.stringify(defaultContent)) as typeof defaultContent

const mockContextValue = {
  content: cloneContent(),
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
  mockContextValue.content = cloneContent()
  mockContextValue.loading = false
})

describe('LandingPage', () => {
  it('renders profile headline and contact link', () => {
    // ensure an experience includes a location so the UI shows it
    mockContextValue.content = cloneContent()
    // set location on the first experience in the cloned default content
    mockContextValue.content.experiences[0] = {
      ...mockContextValue.content.experiences[0],
      location: 'Seattle, WA',
    }

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: /Your Name/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Experience/i })).toHaveAttribute('href', '#experience')

    const contactLink = screen.getByRole('link', { name: /Contact me/i })
    expect(contactLink).toHaveAttribute('href', expect.stringContaining('mailto:'))

    // Verify the experience location is rendered inline with the experience header
    const expHeading = screen.getByRole('heading', { name: /Experience/i })
    const expSection = expHeading.closest('section')
    expect(expSection).not.toBeNull()
    expect(within(expSection!).getByText(/Seattle,\s*WA/)).toBeInTheDocument()
  })

  it('shows recent posts with navigation', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const [postsHeading] = screen.getAllByRole('heading', { name: /Blogs/i })
    const postsSection = postsHeading?.closest('section')
    expect(postsSection).not.toBeNull()
    const postHeadings = within(postsSection!).getAllByRole('heading', { level: 3 })
    expect(postHeadings.length).toBeGreaterThan(0)
    expect(postHeadings[0]).toHaveTextContent('Designing Guardrails for AI-Assisted Coding Teams')

    // Ensure the View all blogs link is present inside the blogs section
    expect(within(postsSection!).getByText('View all blogs')).toBeInTheDocument()

    if (postsSection) {
      const [aiTagLink] = within(postsSection).getAllByRole('link', { name: 'AI' })
      expect(aiTagLink).toHaveAttribute('data-router-link', '/blogs/tags/ai')
    }
  })

  it('omits hidden posts from recent list', () => {
    const contentCopy = cloneContent()
    contentCopy.posts = [
      {
        id: 'public-post',
        title: 'Visible Post',
        content: '# Hello',
        tags: ['Public'],
        hidden: false,
      },
      {
        id: 'secret-post',
        title: 'Hidden Post',
        content: '# Secret',
        tags: ['Public'],
        hidden: true,
      },
    ] as typeof contentCopy.posts

    mockContextValue.content = contentCopy

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Visible Post' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hidden Post' })).not.toBeInTheDocument()
  })
})
