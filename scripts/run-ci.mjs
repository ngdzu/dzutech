#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import yaml from 'yaml'

const WORKFLOW = path.resolve(process.cwd(), '.github', 'workflows', 'ci.yml')
if (!fs.existsSync(WORKFLOW)) {
  console.error('Workflow file not found at', WORKFLOW)
  process.exit(1)
}

const raw = fs.readFileSync(WORKFLOW, 'utf8')
const parsed = yaml.parse(raw)

const jobName = process.argv[2] || 'build-and-verify'
const jobs = parsed.jobs || {}
const job = jobs[jobName]
if (!job) {
  console.error('Job not found in workflow:', jobName)
  process.exit(2)
}

const steps = job.steps || []

async function runStep(step, index) {
  if (!step.run) return
  const stepName = step.name || `step-${index}`
  console.log('\n====> Running step:', stepName)

  // Merge step env over job env over process.env
  const jobEnv = job.env || {}
  const stepEnv = step.env || {}
  const env = { ...process.env, ...jobEnv, ...stepEnv }

  const cwd = step['working-directory'] ? path.resolve(process.cwd(), step['working-directory']) : process.cwd()

  // On multi-line run blocks, execute via bash to match GitHub Actions default shell
  // Allow overriding the shell by setting CI_SIMULATOR_SHELL in the environment.
  const shell = process.env.CI_SIMULATOR_SHELL || '/bin/bash'
  const res = spawnSync(shell, ['-lc', step.run], { stdio: 'inherit', env, cwd })
  if (res.error) {
    console.error('Failed to execute step', stepName, res.error)
    process.exit(res.status || 1)
  }
  if (res.status !== 0) {
    console.error(`Step ${stepName} exited with code`, res.status)
    process.exit(res.status || 1)
  }
}

async function main() {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    try {
      // Only run steps that have a `run` property
      if (step.run) await runStep(step, i)
      else console.log('Skipping step (no run script):', step.name || `step-${i}`)
    } catch (err) {
      console.error('Error running step', step.name || i, err)
      process.exit(1)
    }
  }
  console.log('\nAll steps completed successfully')
}

main()
