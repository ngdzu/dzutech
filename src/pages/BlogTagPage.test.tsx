import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Post } from '../content'
import { BlogTagPage } from './BlogTagPage'

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

beforeEach(() => {
  mockContextValue.content = { posts: [] }
})

describe('BlogTagPage', () => {
  const renderForTag = (tag: string) =>
    render(
      <MemoryRouter initialEntries={[`/blogs/tags/${encodeURIComponent(tag)}`]}>
        <Routes>
          <Route path="/blogs/tags/:tagSlug" element={<BlogTagPage />} />
        </Routes>
      </MemoryRouter>,
    )

  it('renders posts with matching tag that are not hidden', () => {
    mockContextValue.content.posts = [
      {
        id: 'visible-post',
        title: 'Visible Post',
        content: '# Hello',
        tags: ['Public'],
        hidden: false,
      },
      {
        id: 'hidden-post',
        title: 'Hidden Post',
        content: '# Secret',
        tags: ['Public'],
        hidden: true,
      },
    ]

    renderForTag('Public')

    expect(screen.getByRole('heading', { level: 2, name: 'Visible Post' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Hidden Post' })).not.toBeInTheDocument()
  })

  it('shows empty state when only hidden posts match tag', () => {
    mockContextValue.content.posts = [
      {
        id: 'hidden-post',
        title: 'Hidden Post',
        content: '# Secret',
        tags: ['Public'],
        hidden: true,
      },
    ]

    renderForTag('Public')

    expect(
      screen.getByText('No posts currently use the tag “Public”.'),
    ).toBeInTheDocument()
  })
})
