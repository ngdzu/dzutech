import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ImagePreviewModal } from './ImagePreviewModal'

describe('ImagePreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    imageUrl: 'https://example.com/test.jpg',
    imageAlt: 'Test image',
    markdownLink: '![](/photos/test-id)'
  }

  beforeEach(() => {
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
    cleanup()
    // Reset body overflow style
    document.body.style.overflow = ''
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ImagePreviewModal {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with image and markdown when isOpen is true', () => {
    render(<ImagePreviewModal {...defaultProps} />)

    expect(screen.getByAltText('Test image')).toBeInTheDocument()
    expect(screen.getByText('Markdown:')).toBeInTheDocument()
    expect(screen.getByText('![](/photos/test-id)')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onCloseSpy = vi.fn()
    render(<ImagePreviewModal {...defaultProps} onClose={onCloseSpy} />)

    const closeButton = screen.getByLabelText('Close preview')
    fireEvent.click(closeButton)

    expect(onCloseSpy).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking outside the modal', () => {
    const onCloseSpy = vi.fn()
    render(<ImagePreviewModal {...defaultProps} onClose={onCloseSpy} />)

    const modalBackdrop = document.querySelector('.fixed.inset-0') as HTMLElement
    fireEvent.click(modalBackdrop)

    expect(onCloseSpy).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    const onCloseSpy = vi.fn()
    render(<ImagePreviewModal {...defaultProps} onClose={onCloseSpy} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCloseSpy).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking inside the modal content', () => {
    const onCloseSpy = vi.fn()
    render(<ImagePreviewModal {...defaultProps} onClose={onCloseSpy} />)

    const modalContent = document.querySelector('.bg-night-900') as HTMLElement
    fireEvent.click(modalContent)

    expect(onCloseSpy).not.toHaveBeenCalled()
  })

  it('prevents body scroll when modal is open', () => {
    const { unmount } = render(<ImagePreviewModal {...defaultProps} />)
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('unset')
  })

  it('copies markdown to clipboard when copy button is clicked', async () => {
    render(<ImagePreviewModal {...defaultProps} />)

    const copyButton = screen.getByLabelText('Copy markdown')
    fireEvent.click(copyButton)

    // Should copy the markdown link to clipboard
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('![](/photos/test-id)')
  })

  it('shows "Copied!" message when copy button is clicked', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    render(<ImagePreviewModal {...defaultProps} />)
    const copyButton = screen.getByRole('button', { name: /copy markdown/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('falls back to textarea method when clipboard API fails', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('Clipboard API blocked'))
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    // Mock document methods for fallback
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
    })

    // Mock alert to ensure it's not called
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ImagePreviewModal {...defaultProps} />)
    const copyButton = screen.getByRole('button', { name: /copy markdown/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(defaultProps.markdownLink)
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(alertSpy).not.toHaveBeenCalled()
    })

    // Cleanup mocks
    alertSpy.mockRestore()
  })
})