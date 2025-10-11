#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { createCoverageMap } = require('istanbul-lib-coverage')
const libReport = require('istanbul-lib-report')
const reports = require('istanbul-reports')

const root = process.cwd()
const front = path.join(root, 'coverage', 'coverage-final.json')
const server = path.join(root, 'server', 'coverage', 'coverage-final.json')

const outDir = path.join(root, 'coverage', 'merged')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

let map = createCoverageMap({})
let loaded = 0

function tryLoad(filePath) {
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const json = JSON.parse(raw)
    return json
  } catch (e) {
    console.error('Failed to load coverage from', filePath, e.message)
    return null
  }
}

const frontJson = tryLoad(front)
const serverJson = tryLoad(server)

if (!frontJson && !serverJson) {
  console.error('No coverage files found. Expecting at least one of:', front, server)
  process.exit(2)
}

if (frontJson) {
  try {
    map.merge(frontJson)
    loaded++
  } catch (e) {
    console.error('Error merging frontend coverage:', e.message)
    process.exit(3)
  }
}

if (serverJson) {
  try {
    map.merge(serverJson)
    loaded++
  } catch (e) {
    console.error('Error merging server coverage:', e.message)
    process.exit(4)
  }
}

// write merged raw JSON for reference
fs.writeFileSync(path.join(outDir, 'coverage-final.json'), JSON.stringify(map.toJSON(), null, 2))

// create reports: lcov and html
const context = libReport.createContext({
  dir: outDir,
  coverageMap: map,
})

const lcovReport = reports.create('lcovonly', {})
const htmlReport = reports.create('html', {})

lcovReport.execute(context)
htmlReport.execute(context)

console.log(`Merged coverage written to ${outDir} (lcov + html + raw json).`)
process.exit(0)
