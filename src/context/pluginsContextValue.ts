import { createContext } from 'react';
import type { PluginManifest } from '../lib/api';

export type PluginsContextValue = {
  plugins: PluginManifest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// React context used by consumers wrapped with `PluginsProvider`.
// Exported here to keep the small snapshot module as a single place to import from.
export const PluginsContext = createContext<PluginsContextValue>({
  plugins: [],
  loading: false,
  error: null,
  refresh: async () => {},
});

// A lightweight snapshot holder used by the non-hook `usePlugins` helper when a real React
// context is not available (tests or when component is not wrapped). PluginsProvider will
// update this snapshot whenever the context value changes.
export let pluginsSnapshot: PluginsContextValue | null = null;
export const setPluginsSnapshot = (val: PluginsContextValue | null) => {
  pluginsSnapshot = val;
};
