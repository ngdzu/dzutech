import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, vi, afterEach, expect } from 'vitest'
import { AdminBlogEditorPage } from './AdminBlogEditorPage'

vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions" />,
}))

vi.mock('../components/ImageUploaderModal', () => ({
  ImageUploaderModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="uploader" /> : null),
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
})
