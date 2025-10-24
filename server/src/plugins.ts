import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

export type PluginManifest = {
  id: string;
  name: string;
  description?: string;
  nav?: { label: string; path: string };
  admin?: { path: string };
  enabled?: boolean;
};

const PLUGINS_DIR = path.resolve(process.cwd(), 'server', 'plugins');

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
  const manifests: PluginManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(PLUGINS_DIR, entry.name, 'manifest.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as PluginManifest;
      manifests.push({ ...parsed, id: entry.name, enabled: parsed.enabled ?? true });
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
    return { ...parsed, id: pluginId, enabled: parsed.enabled ?? true };
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
  const manifest = await readManifest(pluginId);
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
