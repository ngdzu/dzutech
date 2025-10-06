import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Post } from '../content'
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
  mockDeletePost.mockReset()
  mockSetPostVisibility.mockReset()
  mockContextValue.loading = false
  mockContextValue.error = null
  mockContextValue.content = { posts: [] }
})

describe('AdminBlogsPage', () => {
  it('calls setPostVisibility with toggled hidden flag and shows success feedback', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-1',
          title: 'First Post',
          content: 'First content',
          tags: ['Dev'],
          hidden: false,
        },
      ],
    }

    const deferred: { resolve: () => void } = { resolve: () => { } }

    mockSetPostVisibility.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deferred.resolve = () => resolve(undefined)
        }),
    )

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()

    const headings = screen.getAllByRole('heading', { name: 'First Post' })
    const postCard = headings.at(-1)?.closest('article')
    expect(postCard).not.toBeNull()
    const toggleButton = within(postCard!).getByRole('button', { name: 'Hide' })

    const user = userEvent.setup()
    await user.click(toggleButton)

    expect(mockSetPostVisibility).toHaveBeenCalledWith('post-1', true)

    await waitFor(() => expect(toggleButton).toBeDisabled())

    deferred.resolve()

    await screen.findByText('Post hidden from public site')
    await waitFor(() => expect(toggleButton).not.toBeDisabled())
  })

  it('confirms before deleting and surfaces success message', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-1',
          title: 'First Post',
          content: 'First content',
          tags: ['Dev'],
          hidden: false,
        },
      ],
    }

    const deferred: { resolve: () => void } = { resolve: () => { } }

    mockDeletePost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deferred.resolve = () => resolve(undefined)
        }),
    )

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()

    const headings = screen.getAllByRole('heading', { name: 'First Post' })
    const postCard = headings.at(-1)?.closest('article')
    expect(postCard).not.toBeNull()
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
})
