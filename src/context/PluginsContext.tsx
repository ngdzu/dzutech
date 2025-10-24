import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { PluginManifest } from '../lib/api';
import { fetchPlugins } from '../lib/api';
import { PluginsContext } from './pluginsContextValue';

export const PluginsProvider = ({ children }: { children: ReactNode }) => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPlugins();
      setPlugins(list);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch plugins', err);
      setPlugins([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch plugins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ plugins, loading, error, refresh }),
    [plugins, loading, error, refresh],
  );

  // Keep a module-level snapshot in sync for consumers that can't or don't use the React
  // context (tests or non-wrapped renders). This ensures safe defaults without throwing.
  // Try to update the module-level snapshot asynchronously. We do this with a dynamic
  // import to avoid potential circular import problems at module initialization time.
  void import('./pluginsContextValue')
    .then((m) => {
      if (typeof m.setPluginsSnapshot === 'function') m.setPluginsSnapshot(value);
    })
    .catch(() => {});

  return <PluginsContext.Provider value={value}>{children}</PluginsContext.Provider>;
};

// `usePlugins` hook is exported from a separate file to satisfy the react-refresh rule
