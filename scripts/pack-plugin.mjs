#!/usr/bin/env node
// Simple packaging script: uses system 'zip' command to create a plugin ZIP.
// Usage: node ./scripts/pack-plugin.mjs <plugin-dir> [out-zip-path]

import { execSync } from 'child_process';
import { resolve } from 'path';

const [,, pluginDir, outZip] = process.argv;
if (!pluginDir) {
  console.error('Usage: node scripts/pack-plugin.mjs <plugin-dir> [out-zip-path]');
  process.exit(2);
}

const dir = resolve(process.cwd(), pluginDir);
const out = outZip ? resolve(process.cwd(), outZip) : resolve(process.cwd(), `${pluginDir.replace(/\/+$/,'')}.zip`);

try {
  // -r recurse, -q quiet, -X eXclude extra file attributes
  // We zip the pluginDir contents but store them at the root of the zip (no parent directories)
  // Use -j to junk paths is not desired — instead we cd into pluginDir's parent and zip the folder contents.
  // Package the plugin so that the archive's root contains the plugin files
  // (manifest.json at archive root). Change into the plugin directory and zip
  // its contents. The output archive path can be absolute.
  const cmd = `cd ${dir.replace(/'/g, "'\\''")} && zip -r -q ${out.replace(/'/g, "'\\''")} .`;
  console.log('Running:', cmd);
  execSync(cmd, { stdio: 'inherit' });
  console.log('\nCreated plugin zip:', out);
} catch (err) {
  console.error('Failed to create zip:', err.message || err);
  process.exit(1);
}
