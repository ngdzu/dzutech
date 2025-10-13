import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, vi, afterEach, expect } from 'vitest'
import { AdminBlogEditorPage } from './AdminBlogEditorPage'

vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions" />,
}))

vi.mock('../components/ImageUploaderModal', () => ({
  // Render a button when open so tests can trigger the onImageSelect callback
  ImageUploaderModal: ({ isOpen, onImageSelect }: { isOpen: boolean; onImageSelect?: (md: string) => void }) =>
    isOpen ? (
      <button
        data-testid="uploader"
        onClick={() => onImageSelect && onImageSelect('![alt text](/img/test.png)')}
      />
    ) : null,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockContext = {
  content: { posts: [] },
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
  useContent: () => mockContext,
}))

afterEach(() => {
  cleanup()
  mockNavigate.mockReset()
  mockContext.content = { posts: [] }
})

describe('AdminBlogEditorPage', () => {
  it('renders create mode and allows submitting a new post', async () => {
  const updatePosts = vi.fn(async () => Promise.resolve())
  mockContext.updatePosts = updatePosts as unknown as typeof mockContext.updatePosts

    render(
      <MemoryRouter initialEntries={["/admin/blogs/new"]}>
        <AdminBlogEditorPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Create new blog post/i })).toBeInTheDocument()

    const title = screen.getByPlaceholderText(/Introducing resilient frontend architectures/i)
    const content = screen.getByPlaceholderText(/Write or paste the full blog post content./i)
    fireEvent.change(title, { target: { value: 'My Test Post' } })
    fireEvent.change(content, { target: { value: 'This is the content of the post.' } })

    const submit = screen.getByRole('button', { name: /Create blog/i })
    fireEvent.click(submit)

    await waitFor(() => {
      expect(updatePosts).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/admin/blogs')
    })
  })

  it('shows validation message when submitting empty form', async () => {
    render(
      <MemoryRouter>
        <AdminBlogEditorPage />
      </MemoryRouter>,
    )

    const form = document.querySelector('form') as HTMLFormElement | null
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(screen.getByText(/Title and content are required\./i)).toBeTruthy()
    })
  })

  it('opens image uploader and inserts markdown at cursor', async () => {
    const updatePosts = vi.fn(async () => Promise.resolve())
    mockContext.updatePosts = updatePosts as unknown as typeof mockContext.updatePosts

    render(
      <MemoryRouter initialEntries={["/admin/blogs/new"]}>
        <AdminBlogEditorPage />
      </MemoryRouter>,
    )

    const textarea = screen.getByPlaceholderText(/Write or paste the full blog post content\./i) as HTMLTextAreaElement
    // position cursor at start
    textarea.selectionStart = 0
    textarea.selectionEnd = 0

  // Find the visible 'Insert image' control by text and click it
  const insertButton = screen.getByText(/Insert image/i)
  fireEvent.click(insertButton)

    // modal mock renders a button we can click to simulate selection
    const uploader = screen.getByTestId('uploader')
    fireEvent.click(uploader)

    await waitFor(() => {
      expect(textarea.value).toContain('![alt text](/img/test.png)')
    })
  })

  it('prepopulates fields in edit mode and saves changes', async () => {
    // set a post in the context
    mockContext.content = ({
      posts: [
        {
          id: '123',
          title: 'Existing Title',
          content: 'Existing content',
          tags: ['foo', 'bar'],
          hidden: true,
          createdAt: new Date().toISOString(),
        },
      ],
    } as unknown) as typeof mockContext.content

    const updatePosts = vi.fn(async () => Promise.resolve())
    mockContext.updatePosts = updatePosts as unknown as typeof mockContext.updatePosts

    render(
      <MemoryRouter initialEntries={["/admin/blogs/123"]}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Edit blog post/i })).toBeTruthy()
    const title = screen.getByPlaceholderText(/Introducing resilient frontend architectures/i) as HTMLInputElement
    const content = screen.getByPlaceholderText(/Write or paste the full blog post content\./i) as HTMLTextAreaElement
    const tags = screen.getByPlaceholderText(/Engineering, Leadership, Case study/i) as HTMLInputElement
    const hidden = screen.getByRole('checkbox') as HTMLInputElement

    expect(title.value).toBe('Existing Title')
    expect(content.value).toBe('Existing content')
    expect(tags.value).toContain('foo')
    expect(hidden.checked).toBe(true)

    // toggle hidden off
    fireEvent.click(hidden)
    expect(hidden.checked).toBe(false)

    const save = screen.getByRole('button', { name: /Save changes/i })
    fireEvent.click(save)

    await waitFor(() => {
      expect(updatePosts).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/admin/blogs')
    })
  })

  it('shows not-found UI when editing missing post', async () => {
    mockContext.content = { posts: [] }
    render(
      <MemoryRouter initialEntries={["/admin/blogs/missing"]}>
        <Routes>
          <Route path="/admin/blogs/:postId" element={<AdminBlogEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Blog post not found/i)).toBeTruthy()
    })
  })

  it('displays save error when updatePosts rejects', async () => {
    const failing = vi.fn(async () => Promise.reject(new Error('db down')))
    mockContext.updatePosts = failing as unknown as typeof mockContext.updatePosts

    render(
      <MemoryRouter initialEntries={["/admin/blogs/new"]}>
        <AdminBlogEditorPage />
      </MemoryRouter>,
    )

    const title = screen.getByPlaceholderText(/Introducing resilient frontend architectures/i)
    const content = screen.getByPlaceholderText(/Write or paste the full blog post content\./i)
    fireEvent.change(title, { target: { value: 'Will Fail' } })
    fireEvent.change(content, { target: { value: 'Content to save' } })

    const submit = screen.getByRole('button', { name: /Create blog/i })
    fireEvent.click(submit)

    await waitFor(() => {
      expect(screen.getByText(/db down|Unable to save blog post/i)).toBeTruthy()
    })
  })

  it('opens preview modal and renders markdown and tags', async () => {
    render(
      <MemoryRouter initialEntries={["/admin/blogs/new"]}>
        <AdminBlogEditorPage />
      </MemoryRouter>,
    )

    const title = screen.getByPlaceholderText(/Introducing resilient frontend architectures/i)
    const content = screen.getByPlaceholderText(/Write or paste the full blog post content\./i)
    const tags = screen.getByPlaceholderText(/Engineering, Leadership, Case study/i)

    fireEvent.change(title, { target: { value: 'Preview Title' } })
    fireEvent.change(tags, { target: { value: 'alpha, beta' } })
    fireEvent.change(content, { target: { value: '# Hello' } })

    const preview = screen.getByRole('button', { name: /Preview/i })
    fireEvent.click(preview)

    await waitFor(() => {
      const previewHeading = screen.getByText(/Blog Preview/i)
  // the heading is inside the header; use its parent (the modal inner container)
  const modal = previewHeading.closest('div')?.parentElement
  expect(modal).toBeTruthy()
  const w = within(modal as HTMLElement)
      expect(w.getByText(/Hello/i)).toBeTruthy()
      expect(w.getByText(/alpha/i)).toBeTruthy()
      expect(w.getByText(/beta/i)).toBeTruthy()
    })
  })
})
