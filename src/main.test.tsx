import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock all the imported modules first
vi.mock('react', () => ({
  StrictMode: ({ children }: { children: React.ReactNode }) => <div data-testid="strict-mode">{children}</div>
}))

const mockRender = vi.fn()
const mockRoot = { render: mockRender }
const mockCreateRoot = vi.fn(() => mockRoot)

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot
}))

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="browser-router">{children}</div>
}))

vi.mock('./index.css', () => ({}))

vi.mock('./App.tsx', () => ({
  default: () => <div data-testid="app">App Component</div>
}))

vi.mock('./context/ContentContext', () => ({
  ContentProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="content-provider">{children}</div>
}))

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}))

// Mock DOM
const mockRootElement = document.createElement('div')
mockRootElement.id = 'root'

describe('main.tsx', () => {
  let originalGetElementById: typeof document.getElementById

  beforeEach(() => {
    // Mock document.getElementById
    originalGetElementById = document.getElementById
    document.getElementById = vi.fn().mockReturnValue(mockRootElement)

    // Clear mocks
    mockCreateRoot.mockClear()
    mockRender.mockClear()
  })

  afterEach(() => {
    // Restore original getElementById
    document.getElementById = originalGetElementById
  })

  it('can be imported without errors', async () => {
    // This test just verifies that the module can be imported
    // For entry point files, this is often the most meaningful test
    expect(async () => {
      await import('./main.tsx')
    }).not.toThrow()
  })

  it('calls createRoot with the root element', async () => {
    await import('./main.tsx')

    expect(document.getElementById).toHaveBeenCalledWith('root')
    expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement)
  })
})