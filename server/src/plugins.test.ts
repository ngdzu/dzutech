import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  ensurePluginsDir,
  installPluginFromZipBase64,
  readManifest,
  listPlugins,
  setPluginEnabled,
  uninstallPlugin,
} from './plugins';

const PLUGINS_DIR = path.resolve(process.cwd(), 'server', 'plugins');
const TEST_PLUGIN_ID = 'test-plugin-for-ci';

async function cleanup() {
  try {
    await uninstallPlugin(TEST_PLUGIN_ID);
  } catch {
    // ignore
  }
}

describe('server plugins manager', () => {
  beforeEach(async () => {
    await ensurePluginsDir();
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('installs plugin from a base64 zip, reads manifest and lists it', async () => {
    // create a zip in-memory containing manifest.json and a small content file
    type ZipLike = { addFile(name: string, data: Buffer): void; toBuffer(): Buffer };
    const zip = new (AdmZip as unknown as { new (): ZipLike })();
    const manifest = {
      id: TEST_PLUGIN_ID,
      name: 'Test Plugin For CI',
      description: 'A test plugin',
      nav: { label: 'Test', path: '/test' },
      enabled: true,
    };
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
    zip.addFile('content/hello.md', Buffer.from('# hello', 'utf8'));

    const buffer = zip.toBuffer();
    const zipBase64 = buffer.toString('base64');

    const installed = await installPluginFromZipBase64(TEST_PLUGIN_ID, zipBase64);
    expect(installed).toBeTruthy();
    expect(installed.id).toBe(TEST_PLUGIN_ID);

    const read = await readManifest(TEST_PLUGIN_ID);
    expect(read).not.toBeNull();
    expect(read?.name).toBe('Test Plugin For CI');

    const all = await listPlugins();
    const found = all.find((p) => p.id === TEST_PLUGIN_ID);
    expect(found).toBeTruthy();
  });

  it('can enable and disable an installed plugin', async () => {
    // ensure plugin is installed first
    const manifestPath = path.join(PLUGINS_DIR, TEST_PLUGIN_ID, 'manifest.json');
    // if not installed, create one quickly
    try {
      await fs.access(manifestPath);
    } catch {
      type ZipLike = { addFile(name: string, data: Buffer): void; toBuffer(): Buffer };
      const zip = new (AdmZip as unknown as { new (): ZipLike })();
      const manifest = { id: TEST_PLUGIN_ID, name: 'Test Plugin For CI', enabled: true };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
      zip.addFile('content/hi.md', Buffer.from('# hi', 'utf8'));
      const buffer = zip.toBuffer();
      await installPluginFromZipBase64(TEST_PLUGIN_ID, buffer.toString('base64'));
    }

    const disabled = await setPluginEnabled(TEST_PLUGIN_ID, false);
    expect(disabled).not.toBeNull();
    expect(disabled?.enabled).toBe(false);

    const enabled = await setPluginEnabled(TEST_PLUGIN_ID, true);
    expect(enabled).not.toBeNull();
    expect(enabled?.enabled).toBe(true);
  });
});
