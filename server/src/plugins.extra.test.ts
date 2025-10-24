import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  ensurePluginsDir,
  installPluginFromZipBase64,
  readManifest,
  listPlugins,
  setPluginEnabled,
  uninstallPlugin,
} from './plugins';

const PLUGINS_DIR = path.resolve(process.cwd(), 'server', 'plugins');
const EXTRA_ID = 'extra-test-plugin';
const BAD_ID = 'bad-plugin';

async function cleanupId(id: string) {
  try {
    await uninstallPlugin(id);
  } catch {
    // ignore
  }
}

describe('plugins extra coverage', () => {
  beforeEach(async () => {
    await ensurePluginsDir();
    // clean up any left-over test dirs
    await cleanupId(EXTRA_ID);
    await cleanupId(BAD_ID);
  });

  afterEach(async () => {
    await cleanupId(EXTRA_ID);
    await cleanupId(BAD_ID);
  });

  it('listPlugins ignores files and malformed manifests', async () => {
    // create a stray file in plugins dir
    const stray = path.join(PLUGINS_DIR, 'not-a-dir.txt');
    await fs.writeFile(stray, 'hello', 'utf8');

    // create a bad plugin dir with malformed manifest
    const badDir = path.join(PLUGINS_DIR, BAD_ID);
    await fs.mkdir(badDir, { recursive: true });
    await fs.writeFile(path.join(badDir, 'manifest.json'), '{ not: valid json', 'utf8');

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const list = await listPlugins();
    // stray file should not cause issues and bad manifest should be ignored
    const foundBad = list.find((p) => p.id === BAD_ID);
    expect(foundBad).toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    await fs.rm(stray, { force: true });
  });

  it('readManifest returns null for missing or malformed', async () => {
    // missing
    const missing = await readManifest('this-does-not-exist');
    expect(missing).toBeNull();

    // malformed
    const malformedDir = path.join(PLUGINS_DIR, BAD_ID);
    await fs.mkdir(malformedDir, { recursive: true });
    await fs.writeFile(path.join(malformedDir, 'manifest.json'), 'not-json', 'utf8');

    const malformed = await readManifest(BAD_ID);
    expect(malformed).toBeNull();
  });

  it('installPluginFromZipBase64 throws when zip missing manifest', async () => {
    // create zip without manifest
    type ZipLike = { addFile(name: string, data: Buffer): void; toBuffer(): Buffer };
    const zip = new (AdmZip as unknown as { new (): ZipLike })();
    zip.addFile('content/only.md', Buffer.from('# only', 'utf8'));
    const b64 = zip.toBuffer().toString('base64');

    await expect(installPluginFromZipBase64(EXTRA_ID, b64)).rejects.toThrow(
      /missing manifest.json/i,
    );
  });

  it('uninstallPlugin removes directory and setPluginEnabled handles missing manifest', async () => {
    // install a minimal plugin to remove
    type ZipLike = { addFile(name: string, data: Buffer): void; toBuffer(): Buffer };
    const zip = new (AdmZip as unknown as { new (): ZipLike })();
    const manifest = { id: EXTRA_ID, name: 'Extra', enabled: true };
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf8'));
    const b64 = zip.toBuffer().toString('base64');

    const installed = await installPluginFromZipBase64(EXTRA_ID, b64);
    expect(installed).toBeTruthy();

    // now uninstall
    await uninstallPlugin(EXTRA_ID);
    // directory should be gone
    await expect(readManifest(EXTRA_ID)).resolves.toBeNull();

    // setPluginEnabled on missing manifest should return null
    const res = await setPluginEnabled(EXTRA_ID, false);
    expect(res).toBeNull();
  });
});
