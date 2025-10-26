#!/usr/bin/env node

/**
 * Plugin End-to-End Integration Test
 *
 * Tests the complete plugin lifecycle using the existing test infrastructure
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGIN_ZIP = path.join(ROOT_DIR, 'dev-plugins', 'helloworld-test.zip');

async function runCommand(cmd, cwd = ROOT_DIR) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Plugin E2E Test...\n');

    // 1. Package the plugin
    console.log('📦 Packaging HelloWorld plugin...');
    await runCommand('node ./scripts/pack-plugin.mjs dev-plugins/helloworld dev-plugins/helloworld-test.zip');
    console.log('✅ Plugin packaged successfully\n');

    // 2. Run the server-side plugin tests
    console.log('🧪 Running server plugin tests...');
    await runCommand('npm run test --prefix server -- --run src/plugins.admin.test.ts');
    console.log('✅ Server plugin tests passed\n');

    // 3. Run client-side plugin tests
    console.log('🖥️  Running client plugin tests...');
    await runCommand('npm run test -- --run src/App.plugins.test.tsx');
    console.log('✅ Client plugin tests passed\n');

    // 4. Verify packaging worked
    console.log('📦 Verifying plugin package...');
    const zipExists = await fs.access(PLUGIN_ZIP).then(() => true).catch(() => false);
    if (!zipExists) {
      throw new Error('Plugin ZIP was not created');
    }

    // Check ZIP contents
    const zipContents = execSync(`unzip -l ${PLUGIN_ZIP}`, { encoding: 'utf8' });
    if (!zipContents.includes('manifest.json')) {
      throw new Error('Plugin ZIP does not contain manifest.json at root');
    }
    console.log('✅ Plugin package verified\n');

    console.log('🎉 All plugin E2E tests passed!\n');
    console.log('This test verified:');
    console.log('  • Plugin packaging with manifest at root');
    console.log('  • Server-side plugin installation/enable/disable/uninstall');
    console.log('  • Client-side plugin visibility and navigation');
    console.log('  • Static content serving');

  } catch (error) {
    console.error('❌ Plugin E2E test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    try {
      await fs.unlink(PLUGIN_ZIP);
      console.log('✅ Test files cleaned up');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});