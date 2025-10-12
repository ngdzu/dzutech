import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { AdminUploadsPage } from './AdminUploadsPage'

// Mock AdminSessionActions to avoid needing AuthProvider
vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions">Session Actions</div>,
}))

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
    // Ensure document.body exists for tests
    if (!document.body) {
      document.body = document.createElement('body')
      document.appendChild(document.body)
    }

    // default fetch for listing uploads returns empty list
    fetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ uploads: [] }), text: async () => '' } as unknown as Response)

    // mock clipboard with fallback support
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = mockClipboard

    // Stub alert globally
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders UI and shows empty state', async () => {
    render(<AdminUploadsPage />)
    // header
    expect(screen.getByText('Uploaded photos')).toBeDefined()

    // wait for fetch to settle
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    expect(screen.getByText('No uploads yet.')).toBeInTheDocument()
  })

  it('renders uploads from API and allows copy actions and open link', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/test1.png',
      filename: 'test1.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
      presignedUrl: 'https://example.com/test1.png',
    }

    // Clear previous mocks and set up fresh mock
    vi.restoreAllMocks()
    const freshFetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    freshFetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [upload] }),
      text: async () => JSON.stringify({ uploads: [upload] }),
    } as unknown as Response)
    // Set default for any additional calls
    freshFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ uploads: [] }),
      text: async () => '',
    } as unknown as Response)

    render(
      <MemoryRouter>
        <AdminUploadsPage />
      </MemoryRouter>,
    )

    // wait for the row to appear
    await waitFor(() => {
      const cells = screen.getAllByText('test1.png')
      expect(cells.length).toBe(1)
    })

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
    expect(openLink.href).toContain('https://example.com/test1.png')
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
        <AdminUploadsPage />
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

describe('AdminUploadsPage clipboard fallback', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Ensure document.body exists for React 19
    if (!document.body) {
      document.body = document.createElement('body')
    }

    fetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ uploads: [] }), text: async () => '' } as unknown as Response)

    // Mock clipboard to fail
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available'))
    }
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = mockClipboard

    // Mock document methods for fallback
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
    })

    // Mock alert
    vi.spyOn(window, 'alert').mockImplementation(vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it.skip('falls back to document.execCommand when clipboard API fails', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/test2.png',
      filename: 'test2.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
    }

    // Clear previous mocks and set up fresh mock
    vi.restoreAllMocks()
    
    const freshFetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    freshFetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [upload] }),
      text: async () => JSON.stringify({ uploads: [upload] }),
    } as unknown as Response)
    freshFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ uploads: [] }),
      text: async () => '',
    } as unknown as Response)

    // Re-mock clipboard to reject since vi.restoreAllMocks() cleared it
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available')),
    }
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = mockClipboard

    // Mock document methods for fallback
    const originalCreateElement = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'textarea') {
        const textarea = originalCreateElement.call(document, tag) as HTMLTextAreaElement
        textarea.select = vi.fn()
        return textarea
      }
      return originalCreateElement.call(document, tag)
    })
    vi.spyOn(document, 'execCommand').mockReturnValue(true)

    render(
      <MemoryRouter>
        <AdminUploadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      const cells = screen.getAllByText('test2.png')
      expect(cells.length).toBe(1)
    })

    const copyButtons = screen.getAllByText('Copy ID')
    fireEvent.click(copyButtons[0])

    // Should have tried modern clipboard API
    // @ts-expect-error - clipboard test stub
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('abc-123')

    // Should have fallen back to document.execCommand
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.createElement).toHaveBeenCalledWith('textarea')
  })

  it.skip('shows alert when both clipboard methods fail', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/test3.png',
      filename: 'test3.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
    }

    // Clear previous mocks but keep alert stub
    vi.restoreAllMocks()
    
    // Re-mock alert after restore
    const alertSpy = vi.fn()
    window.alert = alertSpy
    
    const freshFetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    freshFetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [upload] }),
      text: async () => JSON.stringify({ uploads: [upload] }),
    } as unknown as Response)
    freshFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ uploads: [] }),
      text: async () => '',
    } as unknown as Response)

    // Re-mock clipboard to reject since vi.restoreAllMocks() cleared it
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available')),
    }
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = mockClipboard

    // Mock execCommand to fail
    vi.spyOn(document, 'execCommand').mockReturnValue(false)

    render(
      <MemoryRouter>
        <AdminUploadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      const cells = screen.getAllByText('test3.png')
      expect(cells.length).toBe(1)
    })

    const copyButtons = screen.getAllByText('Copy ID')
    fireEvent.click(copyButtons[0])

    // Should show alert
    expect(alertSpy).toHaveBeenCalledWith('Unable to copy to clipboard — your browser may block it.')
  })
})

describe('AdminUploadsPage delete functionality', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ uploads: [] }), text: async () => '' } as unknown as Response)

    // mock clipboard
    // @ts-expect-error - test env clipboard stub
    globalThis.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('shows delete confirmation dialog and deletes upload', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/test4.png',
      filename: 'test4.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
    }

    // Clear previous mocks and set up fresh mock
    vi.restoreAllMocks()
    const freshFetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    freshFetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [upload] }),
      text: async () => JSON.stringify({ uploads: [upload] }),
    } as unknown as Response)
    freshFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ uploads: [] }),
      text: async () => '',
    } as unknown as Response)

    // Mock delete request
    const deleteSpy = vi.spyOn(globalWithFetch, 'fetch')
    deleteSpy.mockResolvedValueOnce({ ok: true, text: async () => 'Deleted' } as unknown as Response)

    render(
      <MemoryRouter>
        <AdminUploadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      const cells = screen.getAllByText('test4.png')
      expect(cells.length).toBe(1)
    })

    // Click delete button
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    // Should show confirmation dialog
    expect(screen.getByText('Delete Upload')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete "test4.png"? This action cannot be undone.')).toBeInTheDocument()

    // Click confirm delete - select the button in the dialog (not the table button)
    const confirmButtons = screen.getAllByText('Delete')
    const dialogConfirmButton = confirmButtons.find(button => 
      button.classList.contains('bg-red-600')
    )
    expect(dialogConfirmButton).toBeDefined()
    fireEvent.click(dialogConfirmButton!)

    // Should call delete API
    expect(deleteSpy).toHaveBeenCalledWith('/api/admin/uploads/abc-123', { method: 'DELETE' })

    // Dialog should be closed after successful delete
    await waitFor(() => {
      expect(screen.queryByText('Delete Upload')).not.toBeInTheDocument()
    })
  })

  it('cancels delete when cancel button is clicked', async () => {
    const upload = {
      id: 'abc-123',
      key: 'uploads/test5.png',
      filename: 'test5.png',
      mimetype: 'image/png',
      size: 123,
      created_at: '2025-10-10T00:00:00Z',
    }

    // Clear previous mocks and set up fresh mock
    vi.restoreAllMocks()
    const freshFetchSpy = vi.spyOn(globalWithFetch, 'fetch')
    freshFetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [upload] }),
      text: async () => JSON.stringify({ uploads: [upload] }),
    } as unknown as Response)
    freshFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ uploads: [] }),
      text: async () => '',
    } as unknown as Response)

    render(
      <MemoryRouter>
        <AdminUploadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      const cells = screen.getAllByText('test5.png')
      expect(cells.length).toBe(1)
    })

    // Click delete button
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    // Click cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    // Dialog should be closed
    expect(screen.queryByText('Delete Upload')).not.toBeInTheDocument()
  })
})

export {}
