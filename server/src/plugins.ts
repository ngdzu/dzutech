import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

export type PluginManifest = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  homepage?: string;
  public?: {
    nav?: { title: string; href: string; position?: number };
    routes?: { path: string; entry: string }[];
    url?: string; // legacy
  };
  admin?: {
    menu?: { title: string; href: string; position?: number };
    entry?: string;
    path?: string; // legacy
  };
  nav?: { label: string; path: string }; // legacy
  capabilities?: string[];
  permissions?: Record<string, string[]>;
  compatibility?: { dzutech?: string };
  files?: { public?: string; admin?: string };
  enabled?: boolean;
};

const PLUGINS_DIR = path.resolve(process.cwd(), 'server', 'plugins');
const PLUGINS_DEV_DIR = path.resolve(process.cwd(), 'server', 'plugins-dev');

export const ensurePluginsDir = async () => {
  try {
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
  } catch {
    // ignore
  }
};

export const listPlugins = async (): Promise<PluginManifest[]> => {
  await ensurePluginsDir();
  const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  const devEntries =
    process.env.NODE_ENV === 'development'
      ? await fs.readdir(PLUGINS_DEV_DIR, { withFileTypes: true }).catch(() => [])
      : [];
  const manifests: PluginManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(PLUGINS_DIR, entry.name, 'manifest.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as PluginManifest;
      manifests.push({ ...parsed, id: entry.name, enabled: parsed.enabled ?? false });
    } catch {
      // ignore malformed plugins
      console.error('Failed to read plugin manifest', manifestPath);
    }
  }
  for (const entry of devEntries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(PLUGINS_DEV_DIR, entry.name, 'manifest.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as PluginManifest;
      manifests.push({ ...parsed, id: entry.name, enabled: parsed.enabled ?? false });
    } catch {
      // ignore malformed plugins
      console.error('Failed to read plugin manifest', manifestPath);
    }
  }
  return manifests;
};

export const readManifest = async (pluginId: string): Promise<PluginManifest | null> => {
  const manifestPath = path.join(PLUGINS_DIR, pluginId, 'manifest.json');
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as PluginManifest;
    return { ...parsed, id: pluginId, enabled: parsed.enabled ?? false };
  } catch {
    return null;
  }
};

export const installPluginFromZipBase64 = async (
  pluginId: string,
  zipBase64: string,
): Promise<PluginManifest> => {
  await ensurePluginsDir();
  const pluginDir = path.join(PLUGINS_DIR, pluginId);
  // If pluginDir exists, remove it first (reinstall)
  try {
    await fs.rm(pluginDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  await fs.mkdir(pluginDir, { recursive: true });

  const buffer = Buffer.from(zipBase64, 'base64');
  const zip = new AdmZip(buffer);
  zip.extractAllTo(pluginDir, true);

  // read manifest
  let manifest = await readManifest(pluginId);
  if (!manifest) {
    // Handle common ZIP layout where the archive contains a single top-level
    // directory (for example: helloworld/manifest.json). In that case the
    // extraction will have created pluginDir/<topdir>/... and manifest.json
    // won't be at pluginDir/manifest.json. Detect a single nested directory
    // and move its contents up one level.
    try {
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });
      const onlyDir = entries.filter((e) => e.isDirectory());
      if (onlyDir.length === 1) {
        const nestedName = onlyDir[0].name;
        const nestedPath = path.join(pluginDir, nestedName);
        const nestedManifestPath = path.join(nestedPath, 'manifest.json');
        try {
          // check nested manifest exists
          await fs.access(nestedManifestPath);
          // move nested contents up
          const nestedEntries = await fs.readdir(nestedPath);
          for (const ne of nestedEntries) {
            const src = path.join(nestedPath, ne);
            const dest = path.join(pluginDir, ne);
            // use rename which will move across same filesystem; if fails, fall back to copy+rm
            try {
              await fs.rename(src, dest);
            } catch {
              // fallback: copy then remove
              const stat = await fs.stat(src);
              if (stat.isDirectory()) {
                await fs.mkdir(dest, { recursive: true });
                // simple recursive copy for directories
                // note: for large dirs this could be optimized
                const copyRecursive = async (s: string, d: string) => {
                  const children = await fs.readdir(s, { withFileTypes: true });
                  for (const c of children) {
                    const cs = path.join(s, c.name);
                    const cd = path.join(d, c.name);
                    if (c.isDirectory()) {
                      await fs.mkdir(cd, { recursive: true });
                      await copyRecursive(cs, cd);
                    } else {
                      await fs.copyFile(cs, cd);
                    }
                  }
                };
                await copyRecursive(src, dest);
                // remove original directory
                await fs.rm(src, { recursive: true, force: true });
              } else {
                await fs.copyFile(src, dest);
                await fs.unlink(src);
              }
            }
          }

          // remove now-empty nested dir if it still exists
          try {
            await fs.rm(nestedPath, { recursive: true, force: true });
          } catch {
            // ignore
          }
        } catch {
          // nested manifest not present; continue to throw below
        }
      }
    } catch {
      // ignore errors during reorganize attempt
    }

    // try reading manifest again
    manifest = await readManifest(pluginId);
  }

  if (!manifest) {
    throw new Error('Installed plugin missing manifest.json');
  }
  return manifest;
};

export const uninstallPlugin = async (pluginId: string): Promise<void> => {
  const pluginDir = path.join(PLUGINS_DIR, pluginId);
  await fs.rm(pluginDir, { recursive: true, force: true });
};

export const setPluginEnabled = async (
  pluginId: string,
  enabled: boolean,
): Promise<PluginManifest | null> => {
  const manifestPath = path.join(PLUGINS_DIR, pluginId, 'manifest.json');
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as PluginManifest;
    parsed.enabled = enabled;
    await fs.writeFile(manifestPath, JSON.stringify(parsed, null, 2), 'utf8');
    return { ...parsed, id: pluginId };
  } catch {
    console.error('Failed to update plugin manifest', manifestPath);
    return null;
  }
};
