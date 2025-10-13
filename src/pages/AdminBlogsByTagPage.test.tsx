import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, vi, afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AdminBlogsByTagPage } from './AdminBlogsByTagPage'
import type { Post } from '../content'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

const mockContextValue = {
  content: { posts: [] as Post[] },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  updateSite: vi.fn(),
  updateProfile: vi.fn(),
  updatePosts: vi.fn(),
  deletePost: vi.fn(),
  setPostVisibility: vi.fn(),
  updateExperiences: vi.fn(),
  updateSections: vi.fn(),
  resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
  useContent: () => mockContextValue,
}))

// AdminSessionActions can be a complex component; mock it to focus on page behavior
vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions" />,
}))

afterEach(() => {
  mockContextValue.content = { posts: [] }
  cleanup()
})

describe('AdminBlogsByTagPage', () => {
  it('shows empty state when no posts match the tag', () => {
    mockContextValue.content = { posts: [] }
    render(
      <MemoryRouter initialEntries={["/admin/blogs/tags/my-tag"]}>
        <Routes>
          <Route path="/admin/blogs/tags/:tagSlug" element={<AdminBlogsByTagPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const empty = screen.getByText(/No blog posts currently use the tag/i)
    expect(empty).toBeInTheDocument()
  })

  it('renders matching posts for a tag', async () => {
    const posts: Post[] = [
      { id: '1', title: 'Hello', content: 'content', tags: ['MyTag'], hidden: false },
      { id: '2', title: 'Other', content: 'more', tags: ['Other'], hidden: false },
    ]
    mockContextValue.content = { posts }

    render(
      <MemoryRouter initialEntries={["/admin/blogs/tags/MyTag"]}>
        <Routes>
          <Route path="/admin/blogs/tags/:tagSlug" element={<AdminBlogsByTagPage />} />
        </Routes>
      </MemoryRouter>,
    )

  const headings = screen.getAllByRole('heading', { name: /Blogs tagged/i })
  expect(headings.length).toBeGreaterThan(0)

    const postHeading = await screen.findByRole('heading', { name: 'Hello' })
    expect(postHeading).toBeInTheDocument()
  })
})
