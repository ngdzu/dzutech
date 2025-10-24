import { pluginsSnapshot } from './pluginsContextValue';

export const usePlugins = () => {
  // Return the module-level snapshot if available, otherwise a safe default. The
  // PluginsProvider keeps this snapshot up-to-date, so consumers get realtime-ish
  // data even when not using React context directly (helpful for tests).
  return (
    pluginsSnapshot ?? {
      plugins: [],
      loading: false,
      error: null,
      refresh: async () => {},
    }
  );
};
