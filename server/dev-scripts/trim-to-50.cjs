#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BLOG_DIR = path.join(__dirname, '..', 'dev-data', 'blogs');
const INDEX_PATH = path.join(BLOG_DIR, 'posts-index.json');
const KEEP = 50;

function fileHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(data).digest('hex');
}

function readIndex() {
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeIndex(index) {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run in production');
    process.exit(1);
  }

  if (!fs.existsSync(BLOG_DIR)) {
    console.error('Blog dir not found:', BLOG_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const seen = new Map(); // hash -> kept filename
  const duplicates = [];
  const metadata = readIndex();

  // map metadata by filename for easy lookup
  const metaByFile = new Map();
  for (const m of metadata) {
    const contentPath = path.basename(m.content || '');
    if (contentPath) metaByFile.set(contentPath, m);
  }

  // compute hashes and detect duplicates
  for (const f of files) {
    const p = path.join(BLOG_DIR, f);
    try {
      const h = fileHash(p);
      if (!seen.has(h)) {
        seen.set(h, f);
      } else {
        duplicates.push({ file: f, dupOf: seen.get(h) });
      }
    } catch (err) {
      console.error('Failed to hash', p, err.message);
    }
  }

  // Build list of unique files (keep order from metadata if available, else filesystem)
  const uniqueFiles = [];
  const added = new Set();

  // prefer ordering from metadata
  for (const m of metadata) {
    const fname = path.basename(m.content || '');
    if (!fname) continue;
    if (files.includes(fname) && !added.has(fname)) {
      uniqueFiles.push(fname);
      added.add(fname);
    }
  }
  // append any files not in metadata
  for (const f of files) {
    if (!added.has(f)) {
      uniqueFiles.push(f);
      added.add(f);
    }
  }

  // Remove duplicates from uniqueFiles list (keep first occurrence)
  const finalUnique = [];
  const seenHashes = new Set();
  for (const fname of uniqueFiles) {
    const p = path.join(BLOG_DIR, fname);
    const h = fileHash(p);
    if (!seenHashes.has(h)) {
      seenHashes.add(h);
      finalUnique.push(fname);
    } else {
      // this file is a duplicate that we didn't catch earlier; mark for deletion
      duplicates.push({ file: fname, dupOf: null });
    }
  }

  // If we already have <= KEEP unique, nothing to remove (but still delete duplicate files)
  const toRemove = [];
  if (finalUnique.length > KEEP) {
    const surplus = finalUnique.length - KEEP;
    // remove from the end (least priority)
    const removed = finalUnique.splice(-surplus, surplus);
    for (const r of removed) toRemove.push(r);
  }

  // also add explicit duplicates to removal list
  for (const d of duplicates) {
    // avoid removing the canonical file
    if (d.dupOf === d.file) continue;
    if (!toRemove.includes(d.file) && finalUnique.includes(d.file)) {
      // if duplicate mapping points to another kept file, remove it
      toRemove.push(d.file);
    } else if (!toRemove.includes(d.file) && !finalUnique.includes(d.file)) {
      // already not in finalUnique (will be removed)
      toRemove.push(d.file);
    }
  }

  // Deduplicate toRemove
  const toRemoveSet = new Set(toRemove);

  // Delete files
  let deletedCount = 0;
  for (const f of toRemoveSet) {
    const p = path.join(BLOG_DIR, f);
    try {
      fs.unlinkSync(p);
      deletedCount++;
    } catch (err) {
      console.error('Failed to delete', p, err.message);
    }
    // also remove from metadata map
    if (metaByFile.has(f)) metaByFile.delete(f);
  }

  // Rebuild metadata array for kept files (limit to KEEP)
  const newMeta = [];
  for (const fname of finalUnique) {
    if (newMeta.length >= KEEP) break;
    const m = metaByFile.get(fname);
    if (m) {
      newMeta.push(m);
    } else {
      // create minimal metadata if missing
      const id = path.basename(fname, '.md');
      newMeta.push({ id, title: id, content: path.join('dev-data', 'blogs', fname), tags: [], hidden: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  writeIndex(newMeta);

  console.log(`Found ${files.length} md files, ${seen.size} unique by hash, deleted ${deletedCount} files, keeping ${newMeta.length} entries in index.`);
}

main();
