import { render, screen, waitFor, cleanup } from '@testing-library/react'
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
  cleanup()
  mockNavigate.mockReset()
  mockDeletePost.mockReset()
  mockSetPostVisibility.mockReset()
  mockContextValue.content = { posts: [] }
})

describe('AdminBlogDetailPage', () => {
  it('renders post not found when post does not exist', () => {
    render(
      <MemoryRouter initialEntries={['/admin/blogs/nonexistent']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Blog post not found')).toBeInTheDocument()
    expect(screen.getByText('The blog you\'re looking for either doesn\'t exist or was removed.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to blogs' })).toBeInTheDocument()
  })

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

  it('shows hide button when post is visible', () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-43',
          title: 'Visible Post',
          content: 'Visible content',
          tags: [],
          hidden: false,
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-43']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
  })

  it('displays error message when toggle visibility fails', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-44',
          title: 'Error Post',
          content: 'Error content',
          tags: [],
          hidden: true,
        },
      ],
    }
    mockSetPostVisibility.mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-44']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const toggleButton = screen.getByRole('button', { name: 'Unhide' })
    const user = userEvent.setup()
    await user.click(toggleButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
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

  it('does not delete the post when confirmation is cancelled', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-78',
          title: 'Cancel Post',
          content: 'Cancel content',
          tags: [],
          hidden: false,
        },
      ],
    }

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-78']}>
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
    expect(mockDeletePost).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('displays error message when delete fails', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-79',
          title: 'Delete Error Post',
          content: 'Delete error content',
          tags: [],
          hidden: false,
        },
      ],
    }
    mockDeletePost.mockRejectedValueOnce(new Error('Delete failed'))

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-79']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    const deleteButton = deleteButtons[deleteButtons.length - 1]!
    const user = userEvent.setup()
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument()
    })

    confirmSpy.mockRestore()
  })

  it('renders tags when post has tags', () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-80',
          title: 'Tagged Post',
          content: 'Tagged content',
          tags: ['React', 'TypeScript', 'Testing'],
          hidden: false,
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-80']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Testing')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', async () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-81',
          title: 'Back Button Post',
          content: 'Back button content',
          tags: [],
          hidden: false,
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-81']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const backButton = screen.getByRole('button', { name: 'Back' })
    const user = userEvent.setup()
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('renders edit link with correct href', () => {
    mockContextValue.content = {
      posts: [
        {
          id: 'post-82',
          title: 'Edit Link Post',
          content: 'Edit link content',
          tags: [],
          hidden: false,
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={['/admin/blogs/post-82']}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const editLink = screen.getByRole('link', { name: 'Edit' })
    expect(editLink).toHaveAttribute('href', '/admin/blogs/post-82/edit')
  })
})
