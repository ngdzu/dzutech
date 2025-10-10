import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AdminUploadsPage } from './AdminUploadsPage'

// helper access to global fetch for tests. Use an unknown-based, narrower
// signature that avoids `any` but is compatible with vitest spies.
type TestFetch = { fetch: (...args: unknown[]) => Promise<Response> }
const globalWithFetch = globalThis as unknown as TestFetch

function mockFetchOnce(response: unknown, ok = true, status = 200) {
  return vi.spyOn(globalWithFetch, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as unknown as Response)
}

describe('AdminUploadsPage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // default fetch for listing uploads returns empty list
    fetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ uploads: [] }), text: async () => '' } as unknown as Response)

    // mock clipboard
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders UI and shows empty state', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminUploadsPage />
        </AuthProvider>
      </MemoryRouter>,
    )
    // header
    expect(screen.getByText('Uploaded photos')).toBeDefined()

    // wait for fetch to settle
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    expect(screen.getByText('No uploads yet.')).toBeInTheDocument()
  })

  it('renders uploads from API and allows copy actions and open link', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/foo.png',
      filename: 'foo.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
      presignedUrl: 'https://example.com/foo.png',
    }

    // first call is list
    mockFetchOnce({ uploads: [upload] })

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminUploadsPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    // wait for the row to appear
    await waitFor(() => screen.getByText('foo.png'))

    // Copy ID button
    const copyButtons = screen.getAllByText('Copy ID')
    expect(copyButtons.length).toBeGreaterThan(0)
    fireEvent.click(copyButtons[0])
  // clipboard called with id
  // @ts-expect-error - clipboard test stub
  expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('abc-123')

    // Copy Markdown button
    const copyMd = screen.getAllByText('Copy Markdown')
    expect(copyMd.length).toBeGreaterThan(0)
    fireEvent.click(copyMd[0])
  // should copy markdown referencing /photos/id
  // @ts-expect-error - clipboard test stub
  expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('![](/photos/abc-123)')

    // Open link should use presignedUrl
    const openLink = screen.getByText('Open') as HTMLAnchorElement
    expect(openLink.href).toContain('https://example.com/foo.png')
  })

  it('uploads a file and prepends to the list', async () => {
    // initial list empty
    mockFetchOnce({ uploads: [] })

    // next, POST /api/uploads should return a new upload payload
    const newUpload = { id: 'new-1', filename: 'new.png', mimetype: 'image/png', size: 10, url: '/photos/new-1' }
  const postSpy = vi.spyOn(globalWithFetch, 'fetch')
    // first fetch call used by listing; second will be used by upload POST
    postSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ uploads: [] }), text: async () => '' } as unknown as Response)
    postSpy.mockResolvedValueOnce({ ok: true, json: async () => newUpload, text: async () => JSON.stringify(newUpload) } as unknown as Response)

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminUploadsPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    // wait for initial list fetch
    await waitFor(() => expect(postSpy).toHaveBeenCalled())

    // simulate file selection by assigning to the hidden input
  const fileInput = screen.queryByLabelText(/choose file/i, { selector: 'input', exact: false }) as HTMLInputElement | null
    // If label lookup fails, fallback to querySelector by type
    const input = fileInput ?? (document.querySelector('input[type=file]') as HTMLInputElement)
    const file = new File(['data'], 'new.png', { type: 'image/png' })

  // set files via change event (jsdom requires a FileList-like object)
  fireEvent.change(input, { target: { files: [file] } })

  // click upload (pick the first if multiple rendered)
  const uploadBtns = screen.getAllByText('Upload photo')
  fireEvent.click(uploadBtns[0])

  // The new item should appear in the table
  await waitFor(() => screen.getByText('new.png'))
  })
})

export {}
