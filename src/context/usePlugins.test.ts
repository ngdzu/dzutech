import { describe, it, expect, beforeEach } from 'vitest';

import { usePlugins } from './usePlugins';
import { setPluginsSnapshot, type PluginsContextValue } from './pluginsContextValue';

describe('usePlugins helper', () => {
  beforeEach(() => {
    // reset snapshot before each test
    setPluginsSnapshot(null);
  });

  it('returns a safe default when no snapshot is set', () => {
    const val = usePlugins();
    expect(val).toBeTruthy();
    expect(Array.isArray(val.plugins)).toBe(true);
    expect(val.plugins.length).toBe(0);
    expect(val.loading).toBe(false);
    expect(val.error).toBeNull();
    expect(typeof val.refresh).toBe('function');
  });

  it('returns the module-level snapshot when set', async () => {
    const snapshot = {
      plugins: [{ id: 'p1', name: 'P1' }],
      loading: true,
      error: 'oops',
      refresh: async () => {
        return;
      },
    };
    setPluginsSnapshot(snapshot as PluginsContextValue);

    const val = usePlugins();
    // should be the same object (live binding)
    expect(val.plugins[0].id).toBe('p1');
    expect(val.loading).toBe(true);
    expect(val.error).toBe('oops');
    expect(typeof val.refresh).toBe('function');
    // calling refresh returns a Promise
    const result = val.refresh();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });
});
