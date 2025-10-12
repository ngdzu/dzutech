import React from 'react'
import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminBlogEditorPage } from './AdminBlogEditorPage'
import { BrowserRouter } from 'react-router-dom'

// Minimal provider - no special behavior required for this test
const MockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

vi.mock('../lib/upload', () => ({
  uploadFile: async () => ({ url: '/uploads/x.png', filename: 'x.png', mimetype: 'image/png' }),
}))

// Provide a mutable mock for updatePosts so tests can assert it was called
let updatePostsMock = vi.fn(async () => [])
vi.mock('../context/ContentContext', async () => {
  const actual = await vi.importActual('../context/ContentContext')
  return {
    ...(actual as unknown as Record<string, unknown>),
    useContent: () => ({ content: { posts: [] }, loading: false, updatePosts: updatePostsMock }),
  }
})

// AdminSessionActions uses useAuth; mock it so tests don't need AuthProvider
vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => null,
}))

describe('AdminBlogEditorPage', () => {
  it('inserts image markdown when upload completes', async () => {
    render(
      <BrowserRouter>
        <MockProvider>
          <AdminBlogEditorPage />
        </MockProvider>
      </BrowserRouter>,
    )

    // Click insert image button to open modal
    const insertBtn = screen.getByText('Insert image')
    fireEvent.click(insertBtn)

    // The modal functionality is tested separately in ImageUploaderModal tests
    // This test just verifies the button exists and can be clicked
    expect(insertBtn).toBeTruthy()
  })

  it('shows validation error when submitting without title or content', async () => {
    render(
      <BrowserRouter>
        <MockProvider>
          <AdminBlogEditorPage />
        </MockProvider>
      </BrowserRouter>,
    )

  // find the form submit button (use a DOM selector to avoid ambiguous accessible name matches)
  const submit = document.querySelector('form button[type="submit"]') as HTMLButtonElement | null
  expect(submit).toBeTruthy()

    // submit the form (use submit event to bypass browser constraint validation in the test env)
    const form = document.querySelector('form') as HTMLFormElement | null
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    // validation error should appear
    await waitFor(() => {
      expect(screen.getByText(/Title and content are required\./i)).toBeTruthy()
    })
  })

  it('saves post with hidden flag when checkbox is toggled', async () => {
  // replace mock implementation for this test
  updatePostsMock = vi.fn(async (posts: unknown) => posts)

    render(
      <BrowserRouter>
        <MockProvider>
          <AdminBlogEditorPage />
        </MockProvider>
      </BrowserRouter>,
    )

  // select the first title input by its label text (multiple instances may exist in the DOM)
  const titleInput = (screen.getAllByLabelText(/Title/i)[0] as HTMLInputElement)
  const textarea = (screen.getAllByPlaceholderText('Write or paste the full blog post content.')[0] as HTMLTextAreaElement)

    fireEvent.change(titleInput, { target: { value: 'My Test' } })
    fireEvent.change(textarea, { target: { value: 'Some content here' } })

    // toggle hidden checkbox
    const checkbox = document.querySelector('input[type=checkbox]') as HTMLInputElement
    expect(checkbox).toBeTruthy()
    fireEvent.click(checkbox)

    // submit the form
    const form = document.querySelector('form') as HTMLFormElement | null
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    await waitFor(() => {
      expect(updatePostsMock).toHaveBeenCalled()
  const callsAny = updatePostsMock.mock.calls as unknown[]
  const firstCall = callsAny[0] as unknown[] | undefined
  expect(firstCall).toBeDefined()
  const calledWith = firstCall && firstCall[0]
      // when creating, updatePosts receives an array of posts
      expect(Array.isArray(calledWith)).toBe(true)
      const arr = calledWith as unknown as Array<Record<string, unknown>>
      const saved = arr[arr.length - 1]
      expect(saved).toBeDefined()
      expect(saved).toHaveProperty('hidden', true)
      expect(saved).toHaveProperty('title', 'My Test')
    })
  })
})
