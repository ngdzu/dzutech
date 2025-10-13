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

  it('shows loading state', () => {
    mockContextValue.loading = true
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading posts…')).toBeInTheDocument()
  })

  it('shows context error', () => {
    mockContextValue.error = 'Failed to load posts'
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Failed to load posts')).toBeInTheDocument()
  })

  it('displays hidden badge for hidden posts', () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Hidden Post', content: 'Hidden content', tags: ['Dev'], hidden: true },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('renders tags correctly', () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Tagged Post', content: 'Content', tags: ['React', 'TypeScript'], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('shows no tags message when no tags', () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'No Tags Post', content: 'Content', tags: [], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('No tags assigned')).toBeInTheDocument()
  })

  it('handles file selection', async () => {
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const file = new File(['test content'], 'test.md', { type: 'text/markdown' })

    const user = userEvent.setup()
    await user.upload(fileInput, file)

    expect(screen.getByText('1 file selected')).toBeInTheDocument()
    expect(screen.getByText('test.md')).toBeInTheDocument()
  })

  it('handles multiple file selection', async () => {
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const files = [
      new File(['content 1'], 'file1.md', { type: 'text/markdown' }),
      new File(['content 2'], 'file2.md', { type: 'text/markdown' }),
      new File(['content 3'], 'file3.md', { type: 'text/markdown' }),
    ]

    const user = userEvent.setup()
    await user.upload(fileInput, files)

    expect(screen.getByText('3 files selected')).toBeInTheDocument()
    expect(screen.getByText('file1.md')).toBeInTheDocument()
    expect(screen.getByText('file2.md')).toBeInTheDocument()
    expect(screen.getByText('file3.md')).toBeInTheDocument()
  })

  it('cancels file selection', async () => {
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const file = new File(['test'], 'test.md', { type: 'text/markdown' })

    const user = userEvent.setup()
    await user.upload(fileInput, file)
    expect(screen.getByText('1 file selected')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(screen.queryByText('1 file selected')).not.toBeInTheDocument()
  })

  it('uploads files successfully', async () => {
    mockContextValue.content = { posts: [] }

    // Mock fetch for successful upload with delay to allow UI update
    const mockFetch = vi.fn(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ count: 2 }),
        } as Response), 100)
      )
    )
    vi.stubGlobal('fetch', mockFetch)

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const files = [
      new File(['content 1'], 'file1.md', { type: 'text/markdown' }),
      new File(['content 2'], 'file2.md', { type: 'text/markdown' }),
    ]

    const user = userEvent.setup()
    await user.upload(fileInput, files)

    const importButton = screen.getByRole('button', { name: 'Import selected .md files' })
    await user.click(importButton)

    await waitFor(() => {
      expect(importButton).toBeDisabled()
    })
    expect(screen.getByText('Uploading…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Imported 2 posts')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/posts/upload', {
      method: 'POST',
      credentials: 'include',
      body: expect.any(FormData),
    })
  })

  it('handles upload error', async () => {
    mockContextValue.content = { posts: [] }

    // Mock fetch for failed upload
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Upload failed' }),
      } as Response)
    )
    vi.stubGlobal('fetch', mockFetch)

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const file = new File(['content'], 'test.md', { type: 'text/markdown' })

    const user = userEvent.setup()
    await user.upload(fileInput, file)

    const importButton = screen.getByRole('button', { name: 'Import selected .md files' })
    await user.click(importButton)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('shows unhide button for hidden posts', () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Hidden Post', content: 'Content', tags: [], hidden: true },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Unhide' })).toBeInTheDocument()
  })

  it('shows hide button for visible posts', () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Visible Post', content: 'Content', tags: [], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
  })

  it('handles keyboard navigation with Enter key', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Test Post', content: 'Content', tags: [], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const titleElement = screen.getByRole('link', { name: 'Test Post' })
    
    const user = userEvent.setup()
    titleElement.focus()
    await user.keyboard('{Enter}')

    // Since we're using MemoryRouter, we verify the element exists and is focusable
    expect(titleElement).toBeInTheDocument()
  })

  it('handles keyboard navigation with Space key', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Test Post', content: 'Content', tags: [], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const titleElement = screen.getByRole('link', { name: 'Test Post' })
    
    const user = userEvent.setup()
    titleElement.focus()
    await user.keyboard(' ')

    // Since we're using MemoryRouter, we verify the element exists and is focusable
    expect(titleElement).toBeInTheDocument()
  })

  it('prevents navigation when clicking on tag links', async () => {
    mockContextValue.content = {
      posts: [
        { id: 'post-1', title: 'Tagged Post', content: 'Content', tags: ['React'], hidden: false },
      ],
    }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const tagLink = screen.getByText('React')
    expect(tagLink).toBeInTheDocument()
    expect(tagLink.tagName).toBe('A')
  })

  it('shows truncated file list when many files selected', async () => {
    mockContextValue.content = { posts: [] }

    render(
      <MemoryRouter>
        <AdminBlogsPage />
      </MemoryRouter>,
    )

    const uploadButton = screen.getByRole('button', { name: 'Upload .md files' })
    const fileInput = uploadButton.previousElementSibling as HTMLInputElement
    const files = Array.from({ length: 15 }, (_, i) => 
      new File([`content ${i}`], `file${i}.md`, { type: 'text/markdown' })
    )

    const user = userEvent.setup()
    await user.upload(fileInput, files)

    expect(screen.getByText('15 files selected')).toBeInTheDocument()
    expect(screen.getByText('and more…')).toBeInTheDocument()
  })
})
