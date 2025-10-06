import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Post } from '../content'
import { AdminBlogDetailPage } from './AdminBlogDetailPage'

vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions" />,
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

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
  mockNavigate.mockReset()
  mockDeletePost.mockReset()
  mockSetPostVisibility.mockReset()
  mockContextValue.content = { posts: [] }
})

describe('AdminBlogDetailPage', () => {
  it('toggles visibility for the active post', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-42',
          title: 'Hidden Post',
          content: 'Hidden content',
          tags: [],
          hidden: true,
        },
      ],
    }
    mockSetPostVisibility.mockResolvedValueOnce([])

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-42']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const toggleButton = screen.getByRole('button', { name: 'Unhide' })
    const user = userEvent.setup()
    await user.click(toggleButton)

    expect(mockSetPostVisibility).toHaveBeenCalledWith('post-42', false)
  })

  it('deletes the post and navigates back to the list when confirmed', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-77',
          title: 'Sample Post',
          content: 'Some content',
          tags: [],
          hidden: false,
        },
      ],
    }
    mockDeletePost.mockResolvedValueOnce([])

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-77']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    const deleteButton = deleteButtons[deleteButtons.length - 1]!
    const user = userEvent.setup()
    await user.click(deleteButton)

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockDeletePost).toHaveBeenCalledWith('post-77')
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/blogs'))

    confirmSpy.mockRestore()
  })
})
