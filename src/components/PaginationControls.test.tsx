import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, afterEach } from 'vitest'
import PaginationControls from './PaginationControls'

afterEach(() => {
  cleanup()
})

describe('PaginationControls', () => {
  it('renders pagination controls with correct page info', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={3}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText(/^Page/)).toBeInTheDocument()
    expect(screen.getAllByText('3')).toHaveLength(1)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('disables First and Prev buttons on first page', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last' })).not.toBeDisabled()
  })

  it('disables Next and Last buttons on last page', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={10}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByRole('button', { name: 'First' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prev' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled()
  })

  it('calls onPageChange when First button is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={5}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'First' }))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange when Prev button is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={5}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Prev' }))

    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('calls onPageChange when Next button is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={5}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it('calls onPageChange when Last button is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={5}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Last' }))

    expect(onPageChange).toHaveBeenCalledWith(10)
  })

  it('does not call onPageChange when clicking disabled buttons', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'First' }))
    await user.click(screen.getByRole('button', { name: 'Prev' }))

    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('handles jump to page input and Go button', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    const input = screen.getByLabelText('Go to')
    const goButton = screen.getByRole('button', { name: 'Go' })

    await user.type(input, '5')
    await user.click(goButton)

    expect(onPageChange).toHaveBeenCalledWith(5)
    expect(input).toHaveValue(null) // Should be cleared after successful jump
  })

  it('ignores invalid jump input', async () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={100}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    const user = userEvent.setup()
    const input = screen.getByLabelText('Go to')
    const goButton = screen.getByRole('button', { name: 'Go' })

    // Test invalid input
    await user.type(input, 'abc')
    await user.click(goButton)
    expect(onPageChange).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, '-1')
    await user.click(goButton)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('handles single page scenario', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={5}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText(/^Page/)).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2) // current page and total pages both show 1

    // All navigation buttons should be disabled for single page
    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled()
  })

  it('handles edge case with zero totalItems', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationControls
        totalItems={0}
        pageSize={10}
        currentPage={1}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText(/^Page/)).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2) // current page and total pages both show 1

    // All navigation buttons should be disabled
    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled()
  })
})