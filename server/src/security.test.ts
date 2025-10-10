import fs from 'fs/promises'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('security: package versions', () => {
  it('does not include known-vulnerable multer 1.x', async () => {
    const lockPath = path.resolve(process.cwd(), 'package-lock.json')
    const raw = await fs.readFile(lockPath, 'utf8')
    const lock = JSON.parse(raw)

    // package-lock v3 uses `packages` map and also `dependencies`; check both
    const entries: Array<{ name: string; version: string }> = []

    if (lock.packages) {
      for (const key of Object.keys(lock.packages)) {
        // keys like "node_modules/multer"
        if (key.endsWith('node_modules/multer') || key === 'node_modules/multer') {
          const pkg = lock.packages[key]
          if (pkg && pkg.version) entries.push({ name: 'multer', version: pkg.version })
        }
      }
    }

    if (lock.dependencies && lock.dependencies.multer && lock.dependencies.multer.version) {
      entries.push({ name: 'multer', version: lock.dependencies.multer.version })
    }

    // If no entry found, that's fine (no multer installed). If found, ensure major >= 2
    for (const e of entries) {
      const m = /^([0-9]+)(?:\.|$)/.exec(e.version)
      const major = m ? Number(m[1]) : NaN
      expect(Number.isFinite(major)).toBe(true)
      expect(major).toBeGreaterThanOrEqual(2)
    }
  })
})
