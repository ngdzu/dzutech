import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Post } from '../content'
import { BlogListPage } from './BlogListPage'

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
  updateTutorials: vi.fn(),
  updateSections: vi.fn(),
  resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
  useContent: () => mockContextValue,
}))

beforeAll(() => {
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  })
})

beforeEach(() => {
  mockContextValue.content = { posts: [] }
  mockContextValue.loading = false
  mockNavigate.mockReset()
})

describe('BlogListPage', () => {
  it('renders only posts that are not hidden', () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'visible-post',
          title: 'Visible Post',
          content: '# Hello',
          tags: ['Public'],
          hidden: false,
        },
        {
          id: 'secret-post',
          title: 'Hidden Post',
          content: '# Secret',
          tags: ['Private'],
          hidden: true,
        },
      ],
    }

    render(
      <MemoryRouter>
        <BlogListPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Visible Post' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Hidden Post' })).not.toBeInTheDocument()
  })

  it('shows empty state when all posts are hidden', () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'secret-post',
          title: 'Hidden Post',
          content: '# Secret',
          tags: ['Private'],
          hidden: true,
        },
      ],
    }

    render(
      <MemoryRouter>
        <BlogListPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('No blogs are published yet. Check back soon.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /Hidden Post/i })).not.toBeInTheDocument()
  })
})
