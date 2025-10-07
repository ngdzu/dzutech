import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Chip from './Chip'

describe('Chip', () => {
    it('renders as a Link when `to` is provided', () => {
        render(
            <MemoryRouter>
                <Chip to="/blogs/tags/ai">AI</Chip>
            </MemoryRouter>,
        )

        const link = screen.getByRole('link', { name: /AI/i })
        expect(link).toBeInTheDocument()
        // react-router Link renders an anchor with href in a MemoryRouter
        expect(link).toHaveAttribute('href', '/blogs/tags/ai')
    })

    it('renders as a button when onClick is provided', async () => {
        const user = userEvent.setup()
        const handle = vi.fn()
        render(
            <MemoryRouter>
                <Chip onClick={handle} ariaLabel="click-me">
                    Click me
                </Chip>
            </MemoryRouter>,
        )

        const btn = screen.getByRole('button', { name: /click-me/i })
        expect(btn).toBeInTheDocument()
        await user.click(btn)
        expect(handle).toHaveBeenCalledTimes(1)
    })

    it('renders as a span when no to or onClick is provided', () => {
        render(
            <MemoryRouter>
                <Chip>Static</Chip>
            </MemoryRouter>,
        )

        // should not be a link or button
        expect(screen.queryByRole('link', { name: /Static/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Static/i })).not.toBeInTheDocument()
        // fallback text should be present
        expect(screen.getByText('Static')).toBeInTheDocument()
    })
})
