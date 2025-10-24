#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const PLUGINS_DIR = path.resolve(process.cwd(), 'server', 'plugins');

async function inspectPlugins() {
  try {
    const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    const manifests = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(PLUGINS_DIR, entry.name, 'manifest.json');
      try {
        const raw = await fs.readFile(manifestPath, 'utf8');
        const parsed = JSON.parse(raw);
        manifests.push({
          id: entry.name,
          manifestPath,
          manifest: parsed,
        });
      } catch (err) {
        manifests.push({ id: entry.name, manifestPath, error: String(err) });
      }
    }

    const summary = {
      dir: PLUGINS_DIR,
      count: manifests.length,
      plugins: manifests,
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error('Failed to inspect plugins dir:', err);
    process.exit(2);
  }
}

inspectPlugins();
