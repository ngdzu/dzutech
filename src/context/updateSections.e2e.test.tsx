/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { defaultContent } from '../content'

// Mock the API module but reuse the real module for other exports.
// Create mocks inside the factory and attach them to globalThis so tests can assert calls.
vi.mock('../lib/api', async () => {
    const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
    const fc = vi.fn(() => Promise.resolve(defaultContent))
    const us = vi.fn((payload: unknown) => Promise.resolve(payload))
        // expose to test runtime for assertions
        ; (globalThis as unknown as Record<string, unknown>).__mockFetchContent = fc
        ; (globalThis as unknown as Record<string, unknown>).__mockUpdateSections = us
    return {
        ...actual,
        fetchContent: fc,
        updateSections: us,
    }
})

import { ContentProvider, useContent } from './ContentContext'
import type { SectionsContent } from '../content'
// no top-level effects required in test

const TestConsumer = ({ nextSections }: { nextSections: SectionsContent }) => {
    const { content, updateSections } = useContent()

    return (
        <div>
            <div data-testid="contact-desc">{content.sections.contact.description}</div>
            <button
                type="button"
                data-testid="apply-btn"
                onClick={async () => {
                    try {
                        await updateSections(nextSections)
                    } catch {
                        // swallow for test
                    }
                }}
            >
                Apply
            </button>
        </div>
    )
}

describe('ContentProvider updateSections e2e', () => {
    it('calls API and updates context with nested sections', async () => {
        const newSections: SectionsContent = {
            contact: { description: 'Reach out via email' },
            experiencesPage: { visible: true },
            educations: { visible: true, items: [{ institution: 'Test U', degree: 'BS', year: '2012', description: 'Studied tests' }] },
            programmingLanguages: { visible: true, items: ['TypeScript', 'Rust'] },
            languagesSpoken: { visible: true, items: ['English'] },
            achievements: { visible: true, items: ['Awarded contributor'] },
        }

        render(
            <MemoryRouter>
                <ContentProvider>
                    <TestConsumer nextSections={newSections} />
                </ContentProvider>
            </MemoryRouter>,
        )

        // Wait for initial content load to complete
        await waitFor(() => expect((globalThis as unknown as Record<string, unknown>).__mockFetchContent as any).toHaveBeenCalled())

        // trigger updateSections via the rendered apply button
        const btn = screen.getByTestId('apply-btn')
        btn.click()

        await waitFor(() => expect((globalThis as unknown as Record<string, unknown>).__mockUpdateSections as any).toHaveBeenCalledWith(newSections))

        // Ensure provider content was updated and consumer sees new contact description
        await waitFor(() => expect(screen.getByTestId('contact-desc')).toHaveTextContent('Reach out via email'))
    })
})
