const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const COVERAGE_FILE = path.resolve(process.cwd(), 'coverage/coverage-final.json')
const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 80)

function fail(msg) {
  console.error(msg)
  process.exitCode = 1
}

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('coverage report not found; run tests with coverage before running this check (generate coverage/coverage-final.json)')
  process.exit(2)
}

const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'))

// get staged files
let staged = ''
try {
  staged = execSync('git diff --name-only --cached', { encoding: 'utf8' }).trim()
} catch (err) {
  console.error('failed to get staged files:', err.message)
  process.exit(2)
}

if (!staged) {
  console.log('No staged files to check.')
  process.exit(0)
}

const stagedFiles = staged.split('\n').map((f) => f.trim()).filter(Boolean)

// filter to only source files we care about (ignore test files and test helpers)
const sourceRegex = /^(src\/.*|server\/src\/.*)\.(ts|tsx|js|jsx)$/i
const testRegex = /\.test\.|\.spec\.|__tests__\//i
// files or folders to always exclude from staged coverage checks (relative paths)
const excludePatterns = [
  /^src\/test\//i, // test helpers (e.g. src/test/setup.ts)
  /test\/setup\.(ts|js)x?$/i,
]

// specific files to always ignore in staged coverage check (relative to repo root)
const excludeExactPaths = new Set([
  'server/src/index.ts',
  'src/App.tsx',
])

const toCheck = stagedFiles.filter((f) => {
  if (!sourceRegex.test(f)) return false
  if (testRegex.test(f)) return false
  if (excludePatterns.some((rx) => rx.test(f))) return false
  if (excludeExactPaths.has(f)) return false
  return true
})

if (toCheck.length === 0) {
  console.log('No staged source files to check for coverage.')
  process.exit(0)
}

const failures = []

toCheck.forEach((rel) => {
  const abs = path.resolve(process.cwd(), rel)
  const entry = coverage[abs]
  if (!entry) {
    // No coverage entry for this file — treat as failure so tests must be added
    failures.push({ file: rel, pct: 0, reason: 'no coverage data' })
    return
  }
  const s = entry.s || {}
  const total = Object.keys(s).length
  const covered = Object.values(s).filter((v) => v > 0).length
  // if there are no statements, consider file fully covered (nothing to measure)
  const pct = total === 0 ? 100 : Math.round((covered / total) * 100)
  if (pct < THRESHOLD) failures.push({ file: rel, pct })
})

if (failures.length) {
  console.error('\nCoverage check failed: the following staged files are below the threshold of ' + THRESHOLD + '%:')
  failures.forEach((f) => console.error(` - ${f.file}: ${f.pct}% ${f.reason ? '(' + f.reason + ')' : ''}`))
  console.error('\nPlease add/adjust tests or exclude these files from commits.')
  process.exit(1)
}

console.log('All staged source files meet the coverage threshold (' + THRESHOLD + '%)')
process.exit(0)
