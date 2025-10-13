#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BLOG_DIR = path.join(__dirname, '..', 'dev-data', 'blogs');
const INDEX_PATH = path.join(BLOG_DIR, 'posts-index.json');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function makeId(title) {
  const base = slugify(title).slice(0, 40);
  const h = crypto.createHash('sha1').update(title + Date.now() + Math.random()).digest('hex').slice(0,8);
  return `${base}-${h}`;
}

function buildPost(title, wordTarget) {
  const sections = [];
  sections.push(`# ${title}\n`);
  sections.push(`_Topic: C++ / Qt — High Performance Computing_\n`);

  const intros = [
    'In this post we explore practical strategies to squeeze more performance from C++ applications using the Qt framework.',
    'High-performance computing with C++ and Qt needs careful attention to allocation, threading, and data locality.',
    'We walk through measurement, optimization, and Qt-specific tips for building high-throughput C++ applications.'
  ];
  sections.push(intros[Math.floor(Math.random()*intros.length)] + '\n');

  const topics = [
    'memory management patterns (pooling, arenas)',
    'Qt containers vs std::vector performance tradeoffs',
    'lock-free programming and QAtomic operations',
    'IO strategies: asynchronous IO, zero-copy where possible',
    'profiling workflows with perf / Instruments and Qt Creator',
    'GPU offload using Vulkan/OpenGL with Qt Quick',
    'cache-friendly data structures and SoA vs AoS',
    'parallelism using QThreadPool and task-based design',
    'minimizing signal/slot overhead and using queued connections wisely',
    'serialization and minimizing copy when marshalling data'
  ];

  // build content until we reach approx wordTarget
  let words = sections.join(' ').split(/\s+/).filter(Boolean).length;
  while (words < wordTarget) {
    const t = randomChoice(topics);
    sections.push(`## ${t}\n`);
    // add a few paragraphs
    const paraCount = randInt(1,3);
    for (let i=0;i<paraCount;i++) {
      sections.push(makeParagraph(t));
    }

    // sometimes add a code sample
    if (Math.random() < 0.6) sections.push('\n```cpp\n' + makeCppQtSample() + '\n```\n');

    // sometimes add an image placeholder
    if (Math.random() < 0.3) sections.push(`![diagram](https://picsum.photos/seed/${Math.abs(crypto.createHash('md5').update(t + Math.random()).digest('hex')).toString().slice(0,6)}/1200/600)\n`);

    words = sections.join(' ').split(/\s+/).filter(Boolean).length;
    if (sections.length > 200) break; // safety
  }

  // join and trim to target words
  let content = sections.join('\n\n');
  content = trimToWords(content, wordTarget);
  return content;
}

function makeParagraph(topic) {
  const samples = [
    `A key observation when working on ${topic} is to measure before optimizing: profile hotspots and focus efforts where they matter.`,
    `Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.` ,
    `Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.`
  ];
  const sentences = randInt(2,4);
  let p = '';
  for (let i=0;i<sentences;i++) p += randomChoice(samples) + ' ';
  return p.trim();
}

function makeCppQtSample() {
  // small illustrative C++/Qt snippet focusing on QThreadPool and minimal allocations
  return `#include <QThreadPool>\n#include <QRunnable>\n#include <QVector>\n\nstruct Work : public QRunnable {\n  QVector<int> data;\n  Work(QVector<int>&& d) : data(std::move(d)) {}\n  void run() override {\n    // process in-place to avoid extra allocations\n    for (int &v : data) { v = heavyCompute(v); }\n  }\n  static int heavyCompute(int x) { return x * x; }\n};\n\nvoid scheduleWork(const QVector<int>& inputs) {\n  QThreadPool &pool = *QThreadPool::globalInstance();\n  for (int i = 0; i < inputs.size(); i += 1024) {\n    QVector<int> slice; slice.reserve(1024);\n    int end = qMin(i+1024, inputs.size());\n    for (int j = i; j < end; ++j) slice.append(inputs[j]);\n    pool.start(new Work(std::move(slice)));\n  }\n}`;
}

function trimToWords(text, n) {
  const parts = text.split(/(\s+)/);
  let count = 0;
  let i = 0;
  for (; i < parts.length; i++) {
    if (!parts[i].trim()) continue;
    count++;
    if (count >= n) break;
  }
  return parts.slice(0, i+1).join('');
}

function readIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')); } catch (e) { return []; }
}

function writeIndex(index) { fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8'); }

function main() {
  if (process.env.NODE_ENV === 'production') { console.error('Refusing to run in production'); process.exit(1); }
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

  const index = readIndex();
  const existingFiles = new Set(fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md')));

  const addedMeta = [];
  for (let i = 0; i < 10; i++) {
    const title = `C++/Qt High Performance: Deep Dive ${Date.now().toString().slice(-5)}-${i}`;
    const id = makeId(title);
    const wordTarget = randInt(500, 3000);
    const content = buildPost(title, wordTarget);
    const fname = `${id}.md`;
    const fpath = path.join(BLOG_DIR, fname);
    // ensure uniqueness by content hash
    const h = crypto.createHash('sha1').update(content).digest('hex');
    if ([...existingFiles].some(f => crypto.createHash('sha1').update(fs.readFileSync(path.join(BLOG_DIR,f))).digest('hex') === h)) {
      // skip if identical content already exists
      continue;
    }
    fs.writeFileSync(fpath, content, 'utf8');
    const meta = { id, title, content: path.join('dev-data', 'blogs', fname), tags: ['c++','qt','hpc'], hidden: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addedMeta.push(meta);
    existingFiles.add(fname);
    console.log('Wrote', fpath, `(${content.split(/\s+/).filter(Boolean).length} words)`);
  }

  const newIndex = index.concat(addedMeta);
  writeIndex(newIndex);
  console.log('Appended', addedMeta.length, 'posts to index; new index length', newIndex.length);
}

main();
