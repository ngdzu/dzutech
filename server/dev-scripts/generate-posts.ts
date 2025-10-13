import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'url'

type GeneratedPost = {
  id: string
  title: string
  content: string
  tags: string[]
  hidden: boolean
  createdAt: string
  updatedAt: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUT_DIR = path.resolve(__dirname, '..', 'dev-data', 'blogs')

const ensureDevOnly = () => {
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    console.error('Refusing to run in production environment')
    process.exit(1)
  }
}

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const out: { count: number; skipDb: boolean; dryRun: boolean } = { count: 50, skipDb: false, dryRun: false }
  for (const a of argv) {
    if (a.startsWith('--count=')) {
      const v = parseInt(a.split('=', 2)[1] ?? '', 10)
      if (!Number.isNaN(v) && v > 0) out.count = v
    } else if (a === '--skip-db') {
      out.skipDb = true
    } else if (a === '--dry-run') {
      out.dryRun = true
    }
  }
  return out
}

const words = (s: string) => (s.match(/\S+/g) || []).length

const makeImageUrl = (seed: string, width = 1200, height = 628) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`

const baseParagraphs = [
  'C++ combined with Qt provides a powerful foundation for high performance computing applications, especially when GUI-driven pipelines or image-processing tools are required alongside heavy computation.',
  'Performance in C++/Qt applications hinges on data layout, minimizing copies, careful thread coordination, and leveraging platform SIMD and asynchronous primitives where appropriate.',
  'Qt offers several concurrency primitives such as QThread, QThreadPool, and QtConcurrent which map well to CPU-bound tasks and can be composed with standard C++ concurrency utilities.',
  'When building high throughput systems, prefer contiguous containers (std::vector, QVector) and avoid virtual dispatch in hot loops; templates and CRTP can help with zero-overhead abstractions.',
  'Memory allocation patterns matter: reuse buffers, reserve capacity early, and consider custom allocators for predictable performance in tight loops or real-time constraints.',
  'Use lock-free or fine-grained locking strategies in multithreaded parts; false sharing is a common source of performance degradation on multicore systems.',
  'Profile-driven optimization is essential: tools like perf, VTune, and Instruments help find algorithmic bottlenecks that dwarf micro-optimizations.',
  'Qt’s implicit sharing and containers (QString, QByteArray, QImage) can reduce copying costs when used correctly, but be mindful of when deep copies happen (e.g., when writing to shared data).',
  'NUMA-aware allocation and work scheduling may become critical on large-memory, multi-socket systems—use platform allocators or partition work per NUMA domain.',
  'GPU acceleration (OpenCL, Vulkan, CUDA) can be integrated where appropriate, leaving the CPU for orchestration and UI responsibilities handled by Qt.'
]

const cppQtSample = `#include <QtConcurrent>
#include <QVector>
#include <QtGlobal>

// Example: parallel transform using QtConcurrent::mapped
QVector<int> parallel_prefix_sum(const QVector<int>& input) {
  QVector<int> out(input.size());
  // This is illustrative: a real prefix sum would use a parallel scan algorithm.
  QtConcurrent::blockingMap(out, [&input](int &v){ /* mapping placeholder */ Q_UNUSED(v); });
  return out;
}
`

const ensureOutDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const writeMdFile = async (dir: string, post: GeneratedPost) => {
  const mdFilename = path.join(dir, `${post.id}.md`)
  // write markdown content
  await fs.writeFile(mdFilename, post.content, 'utf8')
  return mdFilename
}

const writeMetadataIndex = async (dir: string, metadata: Array<Record<string, unknown>>) => {
  const idxFile = path.join(dir, 'posts-index.json')
  await fs.writeFile(idxFile, JSON.stringify(metadata, null, 2), 'utf8')
  return idxFile
}

/**
 * Build a markdown document about C++/Qt high performance computing with a target word count.
 * maxWordsCap (optional) enforces an absolute upper bound on words.
 */
const buildDoc = (idx: number, targetWords: number, maxWordsCap?: number): string => {
  const parts: string[] = []
  parts.push(`# C++/Qt High Performance Computing — Part ${idx + 1}`)
  // Add a varied intro
  parts.push(baseParagraphs[idx % baseParagraphs.length])

  // Add technical sections until we reach targetWords
  let curWords = words(parts.join(' '))
  let paraIndex = 0

  while (curWords < targetWords - 200 && !(maxWordsCap && curWords >= maxWordsCap)) {
    const para = baseParagraphs[(idx + paraIndex) % baseParagraphs.length]
    parts.push(para + ' ' + (paraIndex % 3 === 0 ? 'We illustrate with concrete examples and measurements.' : 'Focus on correctness first, optimize with data.'))
    paraIndex += 1
    curWords = words(parts.join(' '))
  }

  // add a deeper technical subsection with Qt and threading
  parts.push('## Qt and Concurrency')
  parts.push('Qt provides QThread, QThreadPool and QtConcurrent to express concurrency. For CPU-bound problems, prefer dividing work into independent chunks and use QThreadPool or std::thread pools to avoid oversubscription.')
  parts.push('Consider using signals/slots carefully: queued connections are thread-safe but add latency; use direct calls for hot paths when both sides are on the same thread.')
  curWords = words(parts.join(' '))

  // add code sample
  parts.push('```cpp')
  parts.push(cppQtSample)
  parts.push('```')
  curWords = words(parts.join(' '))

  // add image
  const seed = `cpp-qt-hpc-${idx}`
  parts.push(`![Diagram](${makeImageUrl(seed)})`)
  curWords = words(parts.join(' '))

  // Close with profiling & tips, enforcing maxWordsCap if provided
  while (curWords < targetWords && !(maxWordsCap && curWords >= maxWordsCap)) {
    parts.push('Profiling reveals the true hotspots. Benchmark alternatives and prefer algorithmic changes over micro tweaks. Use cache-friendly layouts, align data, and prefer bulk IO over frequent small IOs.')
    curWords = words(parts.join(' '))
    if (maxWordsCap && curWords > maxWordsCap) {
      // trim the last paragraph to fit within maxWordsCap
      const last = parts.pop() ?? ''
      const lastWords = (last.match(/\S+/g) || []).length
      const allowed = Math.max(0, maxWordsCap - (curWords - lastWords))
      if (allowed > 0) {
        const tokens = last.match(/\S+|\s+/g) || []
        // rebuild last with first `allowed` words
        let taken = 0
        let rebuilt = ''
        for (const t of tokens) {
          if (/\S/.test(t)) {
            if (taken >= allowed) break
            rebuilt += t
            taken += 1
          } else {
            rebuilt += t
          }
        }
        parts.push(rebuilt)
      }
      break
    }
  }

  parts.push('## Conclusions')
  parts.push('Applying these patterns in C++/Qt projects yields significant performance and responsiveness improvements. Always measure and prefer maintainability when performance differences are negligible.')
  let doc = parts.join('\n\n')
  if (maxWordsCap) {
    const toks = doc.match(/\S+|\s+/g) || []
    // count words
    const wordTokens: string[] = []
    let wcount = 0
    for (const t of toks) {
      if (/\S/.test(t)) {
        wcount += 1
        if (wcount > maxWordsCap) break
        wordTokens.push(t)
      } else {
        wordTokens.push(t)
      }
    }
    doc = wordTokens.join('')
  }
  return doc
}

export type GenerateOptions = {
  outDir?: string
  skipDb?: boolean
  dryRun?: boolean
  minWords?: number
  maxWords?: number
}

/**
 * Programmatic API: generate and optionally persist posts.
 */
export const generateAndSavePosts = async (count = 50, options: GenerateOptions = {}) => {
  ensureDevOnly()
  const dir = options.outDir ?? OUT_DIR
  const skipDb = options.skipDb ?? false
  const dryRun = options.dryRun ?? false
  const minWords = options.minWords ?? 500
  const maxWords = options.maxWords ?? 2000

  await ensureOutDir(dir)

  const now = new Date()
  const posts: GeneratedPost[] = []
  const metadataArray: Array<Record<string, unknown>> = []

  for (let i = 0; i < count; i++) {
    const id = randomUUID()
    const title = `C++/Qt High Performance: Patterns (${i + 1})`
  let target = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords
  if (target < minWords) target = minWords
  if (target > maxWords) target = maxWords
    const content = buildDoc(i, target, maxWords)
    const createdAt = new Date(now.getTime() - i * 3600 * 1000).toISOString()
    const post: GeneratedPost = {
      id,
      title,
      content,
      tags: ['c++', 'qt', 'hpc', 'performance'],
      hidden: false,
      createdAt,
      updatedAt: createdAt,
    }
    const mdPath = await writeMdFile(dir, post)
    // metadata object points content to md file path relative to repo
    const relativePath = path.join('server', path.relative(path.resolve(process.cwd(), 'server'), mdPath))
    const meta = {
      id: post.id,
      title: post.title,
      content: relativePath,
      tags: post.tags,
      hidden: post.hidden,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }
    posts.push(post)
  console.log(`Wrote ${mdPath} (${words(content)} words)`)
    metadataArray.push(meta)
  }

  // write metadata index file
  const metadata = metadataArray
  await writeMetadataIndex(dir, metadata)

  if (dryRun) {
  console.log('Dry run complete. Skipping DB persistence.')
    return metadata
  }

  if (!skipDb) {
    try {
      const repo = await import('../src/repository.js')
      if (typeof repo.savePosts !== 'function') {
    console.error('repository.savePosts not available; aborting DB persistence')
        return metadata
      }
      // read md files and populate content for DB
      const toSave: Array<Record<string, unknown>> = []
      for (const m of metadata) {
        const mdPath = path.resolve(process.cwd(), 'server', m.content as string)
        const md = await fs.readFile(mdPath, 'utf8')
        toSave.push({ id: m.id, title: m.title, content: md, tags: m.tags, hidden: m.hidden, createdAt: m.createdAt, updatedAt: m.updatedAt })
      }
      const saved = await repo.savePosts(toSave as unknown as Array<Partial<GeneratedPost> & Record<string, unknown>>)
  console.log(`Saved ${Array.isArray(saved) ? saved.length : 0} posts to DB`)
    } catch (err) {
      console.error('Failed to persist to DB:', err)
    }
  }

  return metadata
}

// CLI entry: preserve original behavior
const main = async () => {
  ensureDevOnly()
  const { count, skipDb, dryRun } = parseArgs()
  // reuse generateAndSavePosts
  await generateAndSavePosts(count, { skipDb, dryRun })
}

main().catch((err) => {
  console.error('Generator failed', err)
  process.exitCode = 1
})
