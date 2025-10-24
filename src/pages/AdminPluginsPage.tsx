import { useEffect, useState } from 'react';
import { AdminHeader } from '../components/AdminHeader';

type PluginManifest = {
  id: string;
  name?: string;
  description?: string;
  nav?: boolean;
  admin?: boolean;
  enabled?: boolean;
};

export const AdminPluginsPage = () => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pluginId, setPluginId] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchPlugins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/plugins');
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      setPlugins(Array.isArray(body.plugins) ? body.plugins : []);
    } catch (err) {
      console.error('Failed to fetch plugins', err);
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlugins();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !pluginId) {
      // default plugin id from filename without extension
      const name = f.name
        .replace(/\.zip$/i, '')
        .replace(/[^a-z0-9-_]/gi, '-')
        .toLowerCase();
      setPluginId(name);
    }
  };

  const install = async () => {
    if (!file || !pluginId) {
      setError('Provide a plugin zip file and an id');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // convert to base64
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = typeof window === 'undefined' ? '' : window.btoa(binary);

      const res = await fetch('/api/admin/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, zipBase64: b64 }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchPlugins();
      setFile(null);
      setPluginId('');
      // clear file input value if present
      const input = document.getElementById('plugin-file-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err) {
      console.error('Install failed', err);
      setError(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const setEnabled = async (id: string, enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/plugins/${encodeURIComponent(id)}/${enabled ? 'enable' : 'disable'}`,
        {
          method: 'POST',
        },
      );
      if (!res.ok) throw new Error(await res.text());
      await fetchPlugins();
    } catch (err) {
      console.error('Toggle failed', err);
      setError(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const uninstall = async (id: string) => {
    if (!confirm(`Remove plugin "${id}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await fetchPlugins();
    } catch (err) {
      console.error('Uninstall failed', err);
      setError(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <AdminHeader />
      <div className="mx-auto max-w-5xl px-6 py-5">
        <h1 className="text-2xl font-semibold text-white">Plugin management</h1>
        <p className="text-sm text-slate-400">
          Upload, enable/disable, or remove plugins for the site.
        </p>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="plugin-file-input"
              type="file"
              accept=".zip"
              onChange={onFileChange}
              disabled={busy}
              className="rounded border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={pluginId}
              onChange={(e) => setPluginId(e.target.value)}
              placeholder="plugin-id (optional)"
              className="rounded border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200"
              disabled={busy}
            />
            <button
              type="button"
              onClick={install}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow hover:bg-accent-400"
            >
              Upload & install
            </button>
          </div>

          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-800/80 bg-slate-900/50 p-4">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Enabled</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plugins.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                      No plugins installed.
                    </td>
                  </tr>
                ) : (
                  plugins.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-3 align-middle text-slate-200">{p.id}</td>
                      <td className="px-2 py-3 align-middle text-slate-200">{p.name ?? '-'}</td>
                      <td className="px-2 py-3 align-middle text-slate-400">
                        {p.description ?? '-'}
                      </td>
                      <td className="px-2 py-3 align-middle text-slate-400">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(p.enabled)}
                            onChange={() => setEnabled(p.id, !p.enabled)}
                            disabled={busy}
                          />
                        </label>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => uninstall(p.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-full border border-red-600/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-600/10"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPluginsPage;
