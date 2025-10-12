import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ImageUploaderModal } from './ImageUploaderModal'

// Mock fetch globally
const fetchMock = vi.fn()
globalThis.fetch = fetchMock

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
})

// Mock document.execCommand
Object.defineProperty(document, 'execCommand', {
  value: vi.fn(() => true),
  writable: true,
})

describe('ImageUploaderModal', () => {
  const mockOnClose = vi.fn()
  const mockOnImageSelect = vi.fn()

  const mockUpload = {
    id: 'test-id',
    key: 'uploads/test.jpg',
    filename: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    created_at: '2023-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not render when isOpen is false', () => {
    render(
      <ImageUploaderModal
        isOpen={false}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    expect(screen.queryByText('Upload Images')).not.toBeInTheDocument()
  })

  it('renders modal when isOpen is true', () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    expect(screen.getByText('Upload Images')).toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
    expect(screen.getByText('Upload photo')).toBeInTheDocument()
  })

  it('fetches uploads on mount when opened', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/uploads?limit=200')
    })

    expect(screen.getByText('test.jpg')).toBeInTheDocument()
  })

  it('shows loading state while fetching uploads', () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'))

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('handles file selection', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    // Find the file input by its accept attribute
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    // Check that the filename is displayed
    expect(screen.getByText('test.jpg')).toBeInTheDocument()
  })

  it.skip('uploads file successfully', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uploads: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'new-id',
          key: 'uploads/new.jpg',
          filename: 'new.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
        }),
      })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    // Select file
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement
    const file = new File(['test'], 'new.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Click upload
    const uploadButton = screen.getByText('Upload photo')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/uploads', expect.any(Object))
    })

    // Wait for the uploaded file to appear in the list
    await waitFor(() => {
      expect(screen.getByText('new.jpg')).toBeInTheDocument()
    })
  })

  it('shows error when upload fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uploads: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Upload failed'),
      })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    // Select file
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement
    const file = new File(['test'], 'new.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Click upload
    const uploadButton = screen.getByText('Upload photo')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('copies markdown to clipboard', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={undefined} // No onImageSelect means Copy Markdown button
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    const copyButton = screen.getByText('Copy Markdown')
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('![](/photos/test-id)')
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it.skip('falls back to textarea copy when clipboard API fails', async () => {
    // Mock clipboard API to fail for this test
    const originalWriteText = navigator.clipboard.writeText
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'))
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: mockWriteText,
      writable: true,
    })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={undefined}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    const copyButton = screen.getByText('Copy Markdown')
    fireEvent.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith('![](/photos/test-id)')
    expect(document.execCommand).toHaveBeenCalledWith('copy')

    // Restore original
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: originalWriteText,
      writable: true,
    })
  })

  it('calls onImageSelect and closes modal when selecting image', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    const selectButton = screen.getByText('Select')
    fireEvent.click(selectButton)

    expect(mockOnImageSelect).toHaveBeenCalledWith('![](/photos/test-id)')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows delete confirmation dialog', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('Delete')
    const tableDeleteButton = deleteButtons[0] // First delete button is in the table
    fireEvent.click(tableDeleteButton)

    expect(screen.getByText('Delete Upload')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
  })

  it('deletes upload successfully', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ uploads: [mockUpload] }),
      })
      .mockResolvedValueOnce({
        ok: true,
      })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    // Click delete button in table
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    // Confirm delete in modal
    const confirmDeleteButton = screen.getByText('Delete', { selector: 'button.bg-red-600' })
    fireEvent.click(confirmDeleteButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/uploads/test-id', { method: 'DELETE' })
    })

    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument()
  })

  it('closes modal when close button is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    const closeButtons = screen.getAllByRole('button', { name: '' })
    // The close button is the one with the FiX icon (first one)
    fireEvent.click(closeButtons[0])

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when close button is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    // The close button is the one with the FiX icon (first button with no name)
    const closeButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(closeButtons[0])

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('cancels delete confirmation', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [mockUpload] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    // Click delete button in table
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    // Cancel delete - find cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(screen.queryByText('Delete Upload')).not.toBeInTheDocument()
  })

  it('shows empty state when no uploads', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploads: [] }),
    })

    render(
      <ImageUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onImageSelect={mockOnImageSelect}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No uploads yet.')).toBeInTheDocument()
    })
  })
})