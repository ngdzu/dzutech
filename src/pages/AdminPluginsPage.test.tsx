import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import AdminPluginsPage from './AdminPluginsPage';

// Mock AdminSessionActions to avoid needing AuthProvider
vi.mock('../components/AdminSessionActions', () => ({
  AdminSessionActions: () => <div data-testid="admin-session-actions">Session Actions</div>,
}));

// Narrow global.fetch signature for spies
type TestFetch = { fetch: (...args: unknown[]) => Promise<Response> };
const globalWithFetch = globalThis as unknown as TestFetch;

// Ensure `btoa` is available in the test environment without using `any`.
const ensureBtoa = () => {
  const win = window as unknown as { btoa?: (s: string) => string };
  if (typeof win.btoa === 'function') return;
  const g = globalThis as unknown as {
    Buffer?: { from: (s: string, enc?: string) => { toString: (enc?: string) => string } };
  };
  if (g.Buffer && typeof g.Buffer.from === 'function') {
    win.btoa = (s: string) => g.Buffer!.from(s, 'binary').toString('base64');
    return;
  }
  // Last-resort stub that will cause a clear failure if btoa is required but
  // not available in the environment.
  win.btoa = () => {
    throw new Error('btoa unavailable in test environment');
  };
};

// Helpers to produce Response-like objects for fetch mocks.
const resJson = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

const resText = (text: string, ok = true, status = 200) =>
  ({ ok, status, text: async () => text }) as unknown as Response;

describe('AdminPluginsPage', () => {
  beforeEach(() => {
    // Ensure document.body exists for React 19
    if (!document.body) {
      document.body = document.createElement('body');
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('disables a plugin when the checkbox is unchecked and refreshes the list', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    const initialList = {
      plugins: [
        {
          id: 'blogs',
          name: 'Blogs',
          description: 'Migrated blog content packaged as a plugin.',
          enabled: true,
        },
      ],
    };

    const disabledManifest = {
      id: 'blogs',
      name: 'Blogs',
      description: 'Migrated blog content packaged as a plugin.',
      enabled: false,
    };

    // 1) initial GET /api/admin/plugins
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => initialList,
      text: async () => JSON.stringify(initialList),
    } as unknown as Response);

    // 2) POST /api/admin/plugins/blogs/disable -> returns updated manifest
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => disabledManifest,
      text: async () => JSON.stringify(disabledManifest),
    } as unknown as Response);

    // 3) subsequent GET /api/admin/plugins after toggle returns updated list
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ plugins: [disabledManifest] }),
      text: async () => JSON.stringify({ plugins: [disabledManifest] }),
    } as unknown as Response);

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    // Wait for initial list to render and checkbox to be present
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).toBeChecked();

    // Click to disable
    fireEvent.click(checkbox);

    // Wait for the UI to refresh and show the plugin disabled
    await waitFor(() => expect(checkbox).not.toBeChecked());

    // Verify fetch was called for disable endpoint (method POST)
    const calls = fetchSpy.mock.calls.map((c) => ({ url: String(c[0]), opts: c[1] }));
    const didPostDisable = calls.some((c) => c.url.includes('/api/admin/plugins/blogs/disable'));
    expect(didPostDisable).toBe(true);
  });

  it('enables a plugin when the checkbox is checked and refreshes the list', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    const initialList = {
      plugins: [
        {
          id: 'blogs',
          name: 'Blogs',
          description: 'Migrated blog content packaged as a plugin.',
          enabled: false,
        },
      ],
    };

    const enabledManifest = {
      id: 'blogs',
      name: 'Blogs',
      description: 'Migrated blog content packaged as a plugin.',
      enabled: true,
    };

    // 1) initial GET /api/admin/plugins
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => initialList,
      text: async () => JSON.stringify(initialList),
    } as unknown as Response);

    // 2) POST /api/admin/plugins/blogs/enable -> returns updated manifest
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => enabledManifest,
      text: async () => JSON.stringify(enabledManifest),
    } as unknown as Response);

    // 3) subsequent GET /api/admin/plugins after toggle returns updated list
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ plugins: [enabledManifest] }),
      text: async () => JSON.stringify({ plugins: [enabledManifest] }),
    } as unknown as Response);

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    // Wait for initial list to render and checkbox to be present
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    // Click to enable
    fireEvent.click(checkbox);

    // Wait for the UI to refresh and show the plugin enabled
    await waitFor(() => expect(checkbox).toBeChecked());

    // Verify fetch was called for enable endpoint (method POST)
    const calls = fetchSpy.mock.calls.map((c) => ({ url: String(c[0]), opts: c[1] }));
    const didPostEnable = calls.some((c) => c.url.includes('/api/admin/plugins/blogs/enable'));
    expect(didPostEnable).toBe(true);
  });

  it('uploads a plugin successfully and refreshes the list', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    // 1) initial GET /api/admin/plugins -> empty
    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [] }));

    // 2) POST /api/admin/plugins/install -> success
    fetchSpy.mockResolvedValueOnce(resText('{}'));

    // 3) GET /api/admin/plugins after install -> returns installed plugin
    const manifest = { id: 'test-plugin', name: 'Test', description: 'x', enabled: true };
    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [manifest] }));

    // ensure btoa exists in test environment
    ensureBtoa();

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    // Wait for initial empty state to render
    await screen.findByText('No plugins installed.');

    // Select a fake zip file (polyfilled for arrayBuffer in jsdom)
    const file = {
      name: 'test-plugin.zip',
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as File;
    const input = document.getElementById('plugin-file-input') as HTMLInputElement;
    // fire change with files
    fireEvent.change(input, { target: { files: [file] } });

    // Click upload button
    const btn = screen.getByRole('button', { name: /Upload & install/i });
    fireEvent.click(btn);

    // After install completes, the manifest row should render
    const row = await screen.findByText('test-plugin');
    expect(row).toBeTruthy();
  });

  it('shows an error when upload/install fails', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    // initial GET -> empty
    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [] }));

    // POST install -> fail
    fetchSpy.mockResolvedValueOnce(resText('bad zip', false, 400));

    ensureBtoa();

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    await screen.findByText('No plugins installed.');

    const file = {
      name: 'bad.zip',
      arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
    } as unknown as File;
    const input = document.getElementById('plugin-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const btn = screen.getByRole('button', { name: /Upload & install/i });
    fireEvent.click(btn);

    // Error paragraph should show the server message
    const err = await screen.findByText('bad zip');
    expect(err).toBeTruthy();
  });

  it('uninstalls a plugin when Remove is clicked and confirmed', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    const manifest = { id: 'blogs', name: 'Blogs', description: 'x', enabled: true };

    // 1) initial GET -> has plugin
    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [manifest] }));
    // 2) DELETE -> success
    fetchSpy.mockResolvedValueOnce(resText('{}'));
    // 3) GET after delete -> empty
    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [] }));

    // mock confirm to accept
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    // plugin row present
    await screen.findByText('blogs');

    const remove = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(remove);

    // After deletion, the empty state should appear
    const empty = await screen.findByText('No plugins installed.');
    expect(empty).toBeTruthy();
  });

  it('shows an error when uninstall fails and keeps plugin listed', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    const manifest = { id: 'blogs', name: 'Blogs', description: 'x', enabled: true };

    fetchSpy.mockResolvedValueOnce(resJson({ plugins: [manifest] }));
    fetchSpy.mockResolvedValueOnce(resText('delete failed', false, 500));

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    await screen.findByText('blogs');
    const remove = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(remove);

    const err = await screen.findByText('delete failed');
    expect(err).toBeTruthy();
    // plugin should still be present
    expect(screen.getByText('blogs')).toBeTruthy();
  });

  it('falls back to public listing when admin endpoint is unauthorized', async () => {
    const fetchSpy = vi.spyOn(globalWithFetch, 'fetch');

    const manifest = { id: 'pub', name: 'PublicOnly', description: 'x', enabled: true };

    // First call /api/admin/plugins -> 401
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'unauth',
    } as unknown as Response);
    // Then /api/plugins -> returns public plugin
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ plugins: [manifest] }),
    } as unknown as Response);

    render(
      <MemoryRouter>
        <AdminPluginsPage />
      </MemoryRouter>,
    );

    const row = await screen.findByText('pub');
    expect(row).toBeTruthy();
  });
});
