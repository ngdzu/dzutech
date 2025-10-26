# Plugin system documentation

This document describes the plugin system for the dzutech site. The goal of the plugin system is to allow third-party or first-party extensions to add UI, admin pages and integrate with backend APIs while keeping plugins sandboxed, auditable and easy to develop.

Summary
 - Plugins are delivered as zip packages and extracted into `server/plugins/<plugin-id>` on the server.
 - Each plugin must include a manifest (JSON) that declares metadata, routes, capabilities, permissions and assets.
 - Admins manage plugins on `/admin/plugins` (upload, enable/disable, configure, remove).
 - Plugins may register frontend navigation (public header, admin menu), admin pages under `/admin/<path>`, and backend capabilities (via documented APIs and permissions).

Key design goals
 - Safety: plugins should not be able to steal production secrets or alter core behavior without explicit admin approval.
 - Discoverability: manifest-driven registration for header navigation, admin pages and API capabilities.
 - Developer experience: lightweight local dev and a test-mode that can load unzipped plugin code without full server provisioning.
 - Upgradeability: plugin versions and upgrade path with migrations and compatibility checks.

Plugin package layout
 - Root of the zip must contain a `manifest.json` file (required).
 - Optional recommended structure:

```text
plugin.zip
├─ manifest.json            # required
├─ public/                  # static assets (JS, CSS, images) for frontend
│  └─ ...
├─ admin/                   # admin-page assets (JS/CSS) and routes
│  └─ index.html            # admin entrypoint (SPA) or HTML
├─ pages/                   # optional public pages (client-side routes)
│  └─ ...
└─ README.md                # plugin documentation for admins/devs
```

Where plugins are stored
 - Extracted content lives at `server/plugins/<plugin-id>/`.
 - The server stores plugin metadata in its DB (or a JSON index) including: id, name, version, enabled, installedAt, manifest checksum, and optional owner.

Manifest (recommended schema)
 - Plugins must include `manifest.json`. Below is a recommended minimal schema (illustrative):

```json
{
	"id": "blogs",
	"name": "Blogs",
	"version": "1.0.0",
	"description": "Adds blog pages and admin UI",
	"author": "Your Name <you@example.com>",
	"homepage": "https://github.com/your/plugin-repo",
	"public": {
		"nav": {
			"title": "Blogs",
			"href": "/blogs",
			"position": 10
		},
		"routes": [
			{ "path": "/blogs", "entry": "public/index.html" }
		]
	},
	"admin": {
		"menu": { "title": "Blogs", "href": "/admin/blogs", "position": 20 },
		"entry": "admin/index.html"
	},
	"capabilities": ["posts:create", "posts:edit", "uploads:read"],
	"permissions": {
		"admin": ["posts:*"],
		"editor": ["posts:create","posts:edit"]
	},
	"compatibility": { "dzutech": ">=1.0.0 <2.0.0" },
	"files": {
		"public": "public/",
		"admin": "admin/"
	}
}
```

Important manifest fields explained
 - `id`: unique plugin identifier (lowercase, no spaces). Used as folder name under `server/plugins`.
 - `version`: semantic version for upgrades.
 - `public.nav`: (optional) describes a header navigation link for the public site.
 - `public.routes`: list of public SPA routes and their entry points (relative to plugin root).
 - `admin.menu` and `admin.entry`: register the admin menu item and the SPA entry for /admin pages.
 - `capabilities` and `permissions`: declare the actions the plugin wants to perform; the server uses these to prompt an admin for approval and to enforce runtime permission checks.
 - `compatibility`: semver range indicating which core versions the plugin supports.
 - `files` map — optional, helps validation

Registration & lifecycle
 - Install (upload): Admin uploads `plugin.zip` on `/admin/plugins`. Server validates manifest against schema, extracts zip to `server/plugins/<id>`, records metadata and marks plugin as `installed` but `disabled` by default (recommended).
 - Enable: Admin enables plugin on `/admin/plugins`. Server runs optional `install` hooks (if declared), performs migrations, and flips `enabled=true`.
 - Disable: Plugin remains installed but inactive; server may call `deactivate` hooks.
 - Remove: Admin can uninstall/ remove plugin; server runs `uninstall` hooks (if any) and deletes plugin files after confirmation.

Runtime behavior
 - On startup (or when a plugin is enabled), the server parses `manifest.json` and registers routes:
	 - Admin UI: `/admin/<plugin-path>` served by proxying to plugin admin entry or by serving static files.
	 - Public routes: client-side assets are mounted or proxied so the main site can render plugin pages.
 - Plugins do not run arbitrary server-side code (by default). If a plugin needs server-side behavior, it must register through an explicit extension point (see "Server extension points").

Server extension points & APIs
 - To avoid arbitrary code execution on the server, preferred extension points are:
	 1. REST endpoints provided by the core API that plugins can call (protected by capability checks).
	 2. Event hooks: a small, documented event bus where plugins can subscribe to high-level events (e.g., `onPostSave`, `onUpload`). Hooks are invoked from core code and pass structured data.
	 3. (Optional, advanced) Server-side handlers: plugins may supply server middleware only if an admin explicitly authorizes and the plugin passes an automated security check.

APIs for plugins (examples to document / implement)
 - Authenticated API access: plugins running in admin UI use the same session as the admin. Use token-based calls to the core API (no direct DB access).
 - Presigned uploads: plugin UI can call `/api/presign` to upload media to MinIO/S3 through configured buckets.
 - Plugin configuration API: `/api/plugins/:id/config` to save plugin-specific settings (stored in DB or plugin folder as JSON).

Security & sandboxing
 - Never give plugins direct access to production secrets (DB credentials, S3 secrets). Plugins run in the browser and call documented server APIs that enforce permission checks.
 - Content Security Policy (CSP): plugin-provided static files must be served from the same origin or from an explicit allow-list; if plugin needs external resources, document and prompt admin to allow them.
 - Resource limits: impose rate limits on plugin-initiated API calls and restrict file upload sizes.
 - Validate manifest and disallow risky fields. Warn admins about plugins that request broad permissions.

Developer workflow (recommended)
 1. Create plugin scaffold (manifest + public/admin folders). Keep code in a git repo (recommended structure above).
 2. Develop UI as a normal SPA. For quick development, run the plugin locally (e.g., `npm run dev`) and use the dzutech test site with a host-proxy or CORS to load assets.
 3. Local test mode: the server can load an *unpacked* plugin directory from `server/plugins-dev/<id>` for rapid iteration. Configure `server` to look at `plugins-dev` first in development mode.
 4. Package plugin: zip root contents and upload via `/admin/plugins`. You can package manually or use the included helper script `scripts/pack-plugin.mjs`:

```bash
# From repo root, package the unpacked plugin directory into plugin.zip
node ./scripts/pack-plugin.mjs server/plugins-dev/blogs ./dist/blogs-1.0.0.zip
```

The script usage is: `node scripts/pack-plugin.mjs <plugin-dir> [out-zip-path]` and it creates a zip archive containing the plugin files with `manifest.json` at the archive root.
 5. Test in staging: enable plugin on staging environment and run smoke tests.

Testing & CI
 - Unit tests: test plugin logic with standard JS/TS test runners.
 - Integration tests: add plugin fixture to server test suite to validate plugin registration and admin flows.
 - CI: require plugin manifest validation and a smoke test that ensures the plugin's admin entry loads.

Packaging & CLI
- Included helper: `scripts/pack-plugin.mjs` — simple Node script that invokes the system `zip` command. Example:

```bash
# package ./my-plugin into ./my-plugin.zip
node ./scripts/pack-plugin.mjs ./my-plugin ./my-plugin.zip
```

Also verify the zip contains `manifest.json` at the archive root and that `admin/` and `public/` entries referenced by the manifest exist.

Examples
 - A simple `manifest.json` for a blog plugin is shown above. The plugin would include `public/` for the public pages and `admin/` for the admin SPA.

Operational notes for admins
 - Keep plugin updates under version control and review changelogs before upgrading on production.
 - Back up plugin configuration data and relevant DB snapshots before uninstalling or upgrading plugins that perform migrations.
 - Prefer enabling new plugins on staging first and run the full test suite.

Open questions / TODOs
 - Define the server-side plugin extension API (if server-side code execution is needed) and an approval workflow.
 - Decide if GraphQL is desired for plugin APIs (pros/cons analysis needed).
 - Provide a small CLI helper for packaging and manifest validation.

Where to find plugin code in the repo
 - Extracted plugins: `server/plugins/<id>`
 - Development mount (optional): `server/plugins-dev/<id>` (dev-only; add to server config)

Appendix: manifest checklist
 - `id`, `name`, `version` — required
 - `public.nav` or `public.routes` — optional
 - `admin.menu` and `admin.entry` — optional
 - `capabilities`/`permissions` — recommended for security
 - `compatibility` — recommended
 - `files` map — optional, helps validation

If you'd like, I can:
 - Produce a formal JSON Schema for `manifest.json` and add validation code/tests.
 - Add a small `scripts/package-plugin.sh` to package a plugin and validate the manifest.
 - Add a dev-mode server config that loads `server/plugins-dev` for hot-reload style plugin development.

---
Updated: (autogenerated) — see repo `server` code for the implementation details of plugin loading and admin UI.
















