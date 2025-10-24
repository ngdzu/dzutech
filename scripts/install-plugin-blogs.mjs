import fetch from 'node-fetch';
import fs from 'fs/promises';

const API_URL = 'http://localhost:3000/api/admin/plugins/install';
const PLUGIN_ID = 'blogs';
const ZIP_B64_PATH = './server/plugins/blogs.zip.b64';

async function main() {
  const zipBase64 = await fs.readFile(ZIP_B64_PATH, 'utf8');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add auth header if needed
    },
    body: JSON.stringify({ pluginId: PLUGIN_ID, zipBase64 }),
  });
  const data = await res.json();
  console.log('Install result:', data);
}

main().catch(console.error);