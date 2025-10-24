/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com';
process.env.ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ?? '$2b$10$test.hash.for.admin.password';
process.env.SESSION_NAME = process.env.SESSION_NAME ?? 'test-session';
process.env.SESSION_MAX_AGE_HOURS = process.env.SESSION_MAX_AGE_HOURS ?? '24';
process.env.NODE_ENV = 'test';

import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the session/auth middleware so admin endpoints can be exercised in tests
vi.doMock('./requireAuth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = req.session || {};
    req.session.user = { email: process.env.ADMIN_EMAIL };
    next();
  },
}));

// Mock connect-pg-simple to avoid creating a real PG session store that expects
// a real pool with a query method during tests. Mirror the lightweight mock
// used in other server tests.
vi.mock(
  'connect-pg-simple',
  () =>
    ({
      default: (session: any) => {
        const Base = session && session.Store ? session.Store : class {};
        class MockStore extends Base {
          sessions: Map<string, any>;
          constructor(...args: any[]) {
            super(...args);
            this.sessions = new Map();
          }
          on() {}
          get(sid: string, cb: (err: unknown, sess?: unknown) => void) {
            if (typeof cb === 'function') cb(null, this.sessions.get(sid) ?? null);
          }
          set(sid: string, sess: unknown, cb: (err?: unknown) => void) {
            try {
              this.sessions.set(sid, sess);
              if (typeof cb === 'function') cb();
            } catch (e) {
              if (typeof cb === 'function') cb(e);
            }
          }
          destroy(sid: string, cb: (err?: unknown) => void) {
            this.sessions.delete(sid);
            if (typeof cb === 'function') cb();
          }
        }
        return MockStore;
      },
    }) as any,
);

vi.doMock('./db.js', () => ({ pool: {} }));

describe('admin plugins install endpoint', () => {
  const pluginId = 'blogs';
  const pluginsDir = path.resolve(process.cwd(), 'server', 'plugins', pluginId);

  beforeEach(() => {
    // reset modules so index.js picks up mocks
    vi.resetModules();
  });

  afterEach(async () => {
    // cleanup installed plugin directory if present
    try {
      await fs.rm(pluginsDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('accepts a base64 ZIP via POST and installs the plugin', async () => {
    const mod = await import('./index.js');
    const app = (mod as any).app as any;

    // Build a small in-memory ZIP with a manifest.json and a content file so the
    // test does not depend on repository fixtures. Use adm-zip to create a valid
    // ZIP buffer and encode it as base64 for the API payload.
    const AdmZip = (await import('adm-zip')).default as any;
    const ZipCtor: any = AdmZip;
    const zip = new ZipCtor();
    const manifest = JSON.stringify(
      { name: 'Blogs plugin', nav: { label: 'Blogs', path: '/blogs' } },
      null,
      2,
    );
    zip.addFile('manifest.json', Buffer.from(manifest, 'utf8'));
    zip.addFile('content/00one.md', Buffer.from('# Sample blog content\n\nHello world', 'utf8'));
    const zipBuf = zip.toBuffer();
    const zipBase64 = zipBuf.toString('base64');

    const res = await request(app)
      .post('/api/admin/plugins/install')
      .send({ pluginId, zipBase64 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', pluginId);
    expect(res.body).toHaveProperty('name');

    // Ensure the admin listing shows the installed plugin
    const listRes = await request(app).get('/api/admin/plugins');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.plugins)).toBe(true);
    const found = listRes.body.plugins.find((p: any) => p.id === pluginId);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('name');

    // Also verify public endpoint includes it (enabled by default)
    const pub = await request(app).get('/api/plugins');
    expect(pub.status).toBe(200);
    const pubFound = pub.body.plugins.find((p: any) => p.id === pluginId);
    expect(pubFound).toBeDefined();

    // Uninstall via admin endpoint
    const del = await request(app).delete(`/api/admin/plugins/${pluginId}`);
    expect(del.status).toBe(200);
    expect(del.body).toHaveProperty('message');

    // Confirm removed
    const after = await request(app).get('/api/admin/plugins');
    const still = after.body.plugins.find((p: any) => p.id === pluginId);
    expect(still).toBeUndefined();
  });
});
