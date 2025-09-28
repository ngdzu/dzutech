import { db, readJson, writeJson } from '../src/db';
import { defaultContent } from '../src/defaultContent';
const ensureSchema = () => {
    db.exec(`CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) WITHOUT ROWID`);
};
const ensureSeedData = () => {
    const rows = db.prepare('SELECT key FROM content').all();
    if (rows.length === 0) {
        console.log('Seeding default content...');
        for (const [key, value] of Object.entries(defaultContent)) {
            writeJson(key, value);
        }
        return;
    }
    // Ensure all keys exist, but keep existing overrides
    for (const [key, value] of Object.entries(defaultContent)) {
        const existing = readJson(key);
        if (existing === undefined) {
            writeJson(key, value);
        }
    }
};
const main = () => {
    ensureSchema();
    ensureSeedData();
    console.log('Database ready.');
};
main();
