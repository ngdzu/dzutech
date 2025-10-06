import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from 'vitest'
import { type Post } from '../content'
import { BlogDetailPage } from './BlogDetailPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

afterEach(() => {
  mockNavigate.mockReset()
  mockContextValue.content = { posts: [] }
})

beforeAll(() => {
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  })
})

describe('BlogDetailPage', () => {
  const posts: Post[] = [
    {
      id: 'post-one',
      title: 'First Post',
      content: '# Hello world',
      tags: ['Intro'],
      hidden: false,
    },
    {
      id: 'post-two',
      title: 'Second Post',
      content: '# Deep dive',
      tags: ['Tech'],
      hidden: false,
    },
    {
      id: 'post-hidden',
      title: 'Hidden Post',
      content: '# Secret',
      tags: ['Private'],
      hidden: true,
    },
  ]

  beforeEach(() => {
    mockContextValue.content = { posts: [...posts] }
    mockContextValue.loading = false
  })

  it('renders a post when routed by id slug', () => {
    render(
      <MemoryRouter initialEntries={['/blogs/post-two']}>
        <Routes>
          <Route path="/blogs/:postId" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const headings = screen.getAllByRole('heading', { level: 1, name: 'Second Post' })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('falls back to index lookup for numeric slugs', () => {
    render(
      <MemoryRouter initialEntries={['/blogs/1']}>
        <Routes>
          <Route path="/blogs/:postId" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const headings = screen.getAllByRole('heading', { level: 1, name: 'Second Post' })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('does not render hidden posts when routed directly by id', () => {
    render(
      <MemoryRouter initialEntries={['/blogs/post-hidden']}>
        <Routes>
          <Route path="/blogs/:postId" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const notFoundHeadings = screen.getAllByText('Blog post not found')
    expect(notFoundHeadings.length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Hidden Post' })).not.toBeInTheDocument()
  })

  it('does not render hidden posts when accessed via numeric slug', () => {
    render(
      <MemoryRouter initialEntries={['/blogs/2']}>
        <Routes>
          <Route path="/blogs/:postId" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const notFoundHeadings = screen.getAllByText('Blog post not found')
    expect(notFoundHeadings.length).toBeGreaterThan(0)
  })
})
