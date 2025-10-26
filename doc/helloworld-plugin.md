# HelloWorld Plugin — demo & how-to

This document shows a minimal plugin bundle for the dzutech app and how to package / install it.

Contents created in this repository:

- `dev-plugins/helloworld/manifest.json` — plugin manifest.
- `dev-plugins/helloworld/public/index.html` — static public page served by the plugin.
- `scripts/pack-plugin.mjs` — small script that runs the system `zip` command to produce a plugin ZIP.

Quick steps — create the ZIP locally

1. From repo root, run (macOS / Linux):

```bash
node ./scripts/pack-plugin.mjs dev-plugins/helloworld dev-plugins/helloworld.zip
```

This will produce `dev-plugins/helloworld.zip` containing the `helloworld` folder.

What the plugin contains

- Top-level `manifest.json` (required). The server should read this to register the plugin.
- A `public/` directory with static assets (HTML/CSS/JS). The server serves this at `/plugins/<id>/` (see example server notes).

Recommended server behavior (install flow)

1. Admin UI uploads plugin ZIP to server (POST /api/plugins/upload). The server should store the archive temporarily.
2. Server extracts the ZIP to `server/plugins/<id>/` (where `<id>` is the `manifest.json` id). The server must validate the manifest exists and the id is safe (no path traversal).
3. Server should expose plugin manifests via the existing `GET /api/plugins` so clients learn which plugins are available and whether enabled.
4. Server should serve static files at `/plugins/<id>/*` from `server/plugins/<id>/public/*`.
5. Admin UI should allow enabling/disabling a plugin (server toggles a flag in a plugins registry/store). When disabled, the server may still host files, but the client will hide navigation and not link to the plugin public pages.

Minimal example server snippets

- Extract uploaded zip and move into plugins folder (Node/Express, using `unzipper`):

```js
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';

app.post('/api/plugins/upload', upload.single('file'), async (req, res) => {
  const tmp = req.file.path; // from multer
  // Open and read manifest.json inside the zip
  const directory = await unzipper.Open.file(tmp);
  const manifestEntry = directory.files.find(f => f.path === 'manifest.json');
  if (!manifestEntry) return res.status(400).send('manifest.json missing');
  const manifestBuf = await manifestEntry.buffer();
  const manifest = JSON.parse(manifestBuf.toString('utf8'));
  const id = path.basename(manifest.id);
  // validate id: only letters/numbers/-/_
  if (!/^[a-z0-9_-]+$/i.test(id)) return res.status(400).send('invalid id');
  const dest = path.join(__dirname, 'plugins', id);
  // remove existing plugin dir if present (or handle upgrades)
  await fs.promises.rm(dest, { recursive: true, force: true });
  await fs.promises.mkdir(dest, { recursive: true });
  // extract all files to dest
  await new Promise((resolve, reject) => {
    fs.createReadStream(tmp)
      .pipe(unzipper.Extract({ path: dest }))
      .on('close', resolve)
      .on('error', reject);
  });
  // Optionally persist plugin metadata (enabled=false by default unless manifest says otherwise)
  // Remove tmp file
  await fs.promises.unlink(tmp);
  res.json({ ok: true, id });
});
```

- Serve plugin static assets from `/plugins/<id>/` (Express static):

```js
app.use('/plugins/:id', (req, res, next) => {
  const id = req.params.id;
  const pluginDir = path.join(__dirname, 'plugins', id, 'public');
  express.static(pluginDir)(req, res, next);
});
```

Security notes

- Validate `manifest.json` and plugin id strictly.
- Run extraction under a directory owned by the server process; drop privileges if possible.
- Limit upload size and scan files if necessary.

How the client should behave (plugin-agnostic)

- The client should call `GET /api/plugins` and render nav links based only on the manifest fields the server exposes (e.g. `public.url`, `nav.label`).
- The client must not import or require plugin-specific code or components.
- For public pages, the client should link to the `public.url` (which points to `/plugins/<id>/index.html`) rather than registering React routes that import plugin code.

Next steps you might implement locally

- Implement the server upload/extract/serve endpoints above (I can help implement or create tests if you want).
- Run the packaging script and upload the resulting zip with the admin UI to test the flow.

If you'd like, I can now:
- create the plugin zip in-repo (by running `zip` here) — I didn't run system commands yet to keep changes small, but I can do that if you want me to also run shell commands in the workspace.
- or implement the server-side extract + serving code directly (risky change) — tell me and I'll implement it with tests.

Tell me which of those two (create zip now vs implement server handling) you want me to do next and I'll proceed.
