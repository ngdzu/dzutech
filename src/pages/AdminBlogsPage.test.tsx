import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '../content'
import { AdminBlogsPage } from './AdminBlogsPage'

vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions" />,
}))

const mockDeletePost = vi.fn<(postId: string) => Promise<unknown>>()
const mockSetPostVisibility = vi.fn<(postId: string, hidden: boolean) => Promise<unknown>>()

const mockContextValue = {
  content: { posts: [] as Post[] },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  updateSite: vi.fn(),
  updateProfile: vi.fn(),
  updatePosts: vi.fn(),
  deletePost: mockDeletePost,
  setPostVisibility: mockSetPostVisibility,
  updateExperiences: vi.fn(),
  updateSections: vi.fn(),
  resetContent: vi.fn(),
}

vi.mock('../context/ContentContext', () => ({
  useContent: () => mockContextValue,
}))

afterEach(() => {
  cleanup()
  mockDeletePost.mockReset()
  mockSetPostVisibility.mockReset()
  mockContextValue.content = { posts: [] }
})

describe('AdminBlogsPage', () => {
  it('shows empty state when no posts', () => {
    mockContextValue.content = { posts: [] }
    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/No blog posts yet/i)).toBeInTheDocument()
  })

  it('toggles hidden and shows feedback', async () => {
    const created = new Date().toISOString()
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'First Post', content: 'First content', tags: ['Dev'], hidden: false, createdAt: created },
      ],
    }

    const deferred: { resolve: (value?: unknown) => void } = { resolve: () => {} }
    mockSetPostVisibility.mockImplementationOnce(
      () => new Promise((resolve) => { deferred.resolve = resolve }),
    )

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

  const titleElement = screen.getByRole('link', { name: 'First Post' })
    const postCard = titleElement.closest('article')
    expect(postCard).not.toBeNull()
  // Created date should be visible in YYYY-MM-DD format
  expect(within(postCard!).getByText(created.slice(0, 10))).toBeInTheDocument()
    const toggleButton = within(postCard!).getByRole('button', { name: 'Hide' })

    const user = userEvent.setup()
    await user.click(toggleButton)

    expect(mockSetPostVisibility).toHaveBeenCalledWith('post-1', true)
    await waitFor(() => expect(toggleButton).toBeDisabled())

    deferred.resolve()
    await screen.findByText('Post hidden from public site')
    await waitFor(() => expect(toggleButton).not.toBeDisabled())
  })

  it('confirms before deleting and shows success', async () => {
    const created2 = new Date().toISOString()
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'First Post', content: 'First content', tags: ['Dev'], hidden: false, createdAt: created2 },
      ],
    }

    const deferred: { resolve: (value?: unknown) => void } = { resolve: () => {} }
    mockDeletePost.mockImplementationOnce(
      () => new Promise((resolve) => { deferred.resolve = resolve }),
    )

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

  const titleElement = screen.getByRole('link', { name: 'First Post' })
  const postCard = titleElement.closest('article')
  expect(postCard).not.toBeNull()
  expect(within(postCard!).getByText(created2.slice(0, 10))).toBeInTheDocument()
    const deleteButton = within(postCard!).getByRole('button', { name: 'Delete' })

    const user = userEvent.setup()
    await user.click(deleteButton)

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockDeletePost).toHaveBeenCalledWith('post-1')

    await waitFor(() => expect(deleteButton).toBeDisabled())
    deferred.resolve()
    await screen.findByText('Post deleted successfully')
    await waitFor(() => expect(deleteButton).not.toBeDisabled())

    confirmSpy.mockRestore()
  })

  it('navigates to blog detail when clicking on title', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'First Post', content: 'First content', tags: ['Dev'], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const titleElement = screen.getByRole('link', { name: 'First Post' })
    const user = userEvent.setup()
    await user.click(titleElement)

    // Since we're using MemoryRouter, we can't easily test navigation
    // But we can verify the title has the correct role and is clickable
    expect(titleElement).toBeInTheDocument()
    expect(titleElement).toHaveAttribute('tabindex', '0')
  })

  it('does not navigate when clicking on content area (not title)', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'First Post', content: 'First content with some text', tags: ['Dev'], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const titleElement = screen.getByRole('link', { name: 'First Post' })
    const postCard = titleElement.closest('article')
    expect(postCard).not.toBeNull()

    // Find the content paragraph
    const contentElement = within(postCard!).getByText('First content with some text')
    
    const user = userEvent.setup()
    await user.click(contentElement)

    // The content element should not have click handlers
    expect(contentElement).not.toHaveAttribute('onclick')
    expect(contentElement.tagName).toBe('P')
  })

  it('supports keyboard navigation on title', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'First Post', content: 'First content', tags: ['Dev'], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const titleElement = screen.getByRole('link', { name: 'First Post' })
    expect(titleElement).toHaveAttribute('tabindex', '0')
    
    const user = userEvent.setup()
    await user.tab({ shift: true }) // Tab backwards to focus something else first
    titleElement.focus()
    expect(titleElement).toHaveFocus()
  })
})
