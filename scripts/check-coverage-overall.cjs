const fs = require('fs')
const path = require('path')

const MERGED_COVERAGE_FILE = path.resolve(process.cwd(), 'coverage/merged/coverage-final.json')
const FRONTEND_COVERAGE_FILE = path.resolve(process.cwd(), 'coverage/coverage-final.json')
const SERVER_COVERAGE_FILE = path.resolve(process.cwd(), 'server/coverage/coverage-final.json')
const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 60)

function fail(msg) {
  console.error(msg)
  process.exitCode = 1
}

// load and merge coverage outputs from frontend and server (frontend takes precedence)
let coverage = {}
// prefer merged coverage if available
if (fs.existsSync(MERGED_COVERAGE_FILE)) {
  try {
    coverage = JSON.parse(fs.readFileSync(MERGED_COVERAGE_FILE, 'utf8'))
  } catch (err) {
    console.error('failed to read merged coverage file:', err.message)
    process.exit(2)
  }
} else {
  if (fs.existsSync(FRONTEND_COVERAGE_FILE)) {
    try {
      coverage = JSON.parse(fs.readFileSync(FRONTEND_COVERAGE_FILE, 'utf8'))
    } catch (err) {
      console.error('failed to read frontend coverage file:', err.message)
      process.exit(2)
    }
  }
  if (fs.existsSync(SERVER_COVERAGE_FILE)) {
    try {
      const serverCov = JSON.parse(fs.readFileSync(SERVER_COVERAGE_FILE, 'utf8'))
      // copy server entries that don't exist in frontend coverage
      Object.keys(serverCov).forEach((k) => {
        if (!coverage[k]) coverage[k] = serverCov[k]
      })
    } catch (err) {
      console.error('failed to read server coverage file:', err.message)
      process.exit(2)
    }
  }
}

if (Object.keys(coverage).length === 0) {
  console.error('coverage report not found; run tests with coverage before running this check')
  process.exit(2)
}

// Calculate overall coverage
let totalStatements = 0
let coveredStatements = 0
let totalBranches = 0
let coveredBranches = 0
let totalFunctions = 0
let coveredFunctions = 0
let totalLines = 0
let coveredLines = 0

Object.values(coverage).forEach((fileCoverage) => {
  // Statements
  if (fileCoverage.s) {
    Object.values(fileCoverage.s).forEach((count) => {
      totalStatements++
      if (count > 0) coveredStatements++
    })
  }

  // Branches
  if (fileCoverage.b) {
    Object.values(fileCoverage.b).forEach((branchCounts) => {
      if (Array.isArray(branchCounts)) {
        branchCounts.forEach((count) => {
          totalBranches++
          if (count > 0) coveredBranches++
        })
      }
    })
  }

  // Functions
  if (fileCoverage.f) {
    Object.values(fileCoverage.f).forEach((count) => {
      totalFunctions++
      if (count > 0) coveredFunctions++
    })
  }

  // Lines
  if (fileCoverage.l) {
    Object.values(fileCoverage.l).forEach((count) => {
      totalLines++
      if (count > 0) coveredLines++
    })
  }
})

const statementPct = totalStatements === 0 ? 100 : Math.round((coveredStatements / totalStatements) * 100)
const branchPct = totalBranches === 0 ? 100 : Math.round((coveredBranches / totalBranches) * 100)
const functionPct = totalFunctions === 0 ? 100 : Math.round((coveredFunctions / totalFunctions) * 100)
const linePct = totalLines === 0 ? 100 : Math.round((coveredLines / totalLines) * 100)

console.log(`Overall Coverage Report:`)
console.log(`Statements: ${statementPct}% (${coveredStatements}/${totalStatements})`)
console.log(`Branches: ${branchPct}% (${coveredBranches}/${totalBranches})`)
console.log(`Functions: ${functionPct}% (${coveredFunctions}/${totalFunctions})`)
console.log(`Lines: ${linePct}% (${coveredLines}/${totalLines})`)

const minPct = Math.min(statementPct, branchPct, functionPct, linePct)

if (minPct < THRESHOLD) {
  console.error(`\nCoverage check failed: overall coverage (${minPct}%) is below the threshold of ${THRESHOLD}%.`)
  console.error('Please add more tests to improve coverage.')
  process.exit(1)
}

console.log(`\nAll coverage metrics meet the threshold of ${THRESHOLD}%.`)
process.exit(0)