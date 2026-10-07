#!/usr/bin/env node
/**
 * Link this checkout against a dsh source checkout for development.
 *
 * The Host packages are peerDependencies: the running installation supplies
 * them at runtime, and the install also supplies the toolchain. While
 * developing against a source checkout, this script points node_modules at
 * that checkout so type checking and tests run without publishing anything.
 *
 *   DSH_CHECKOUT=/path/to/deepseek-harness node scripts/link-dev-deps.mjs
 *
 * The checkout defaults to a sibling `deepseek-harness` directory.
 */
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkout = resolve(process.env.DSH_CHECKOUT ?? join(root, '..', 'deepseek-harness'))

/** Host packages this plugin imports, and where a dsh checkout keeps them. */
const DSH_PACKAGES = {
  '@deepseek-ai/cordis': 'vendor/cordis',
  '@deepseek-ai/cordis-plugin-loader': 'vendor/loader',
  '@deepseek-ai/schemastery': 'vendor/schemastery',
  '@deepseek-ai/dsh-agent': 'packages/core/agent',
  '@deepseek-ai/dsh-tools': 'packages/core/tools',
  '@deepseek-ai/dsh-llm': 'packages/llm/llm',
  '@deepseek-ai/dsh-session': 'packages/core/session',
  '@deepseek-ai/dsh-subagent': 'packages/subagent/subagent',
  '@deepseek-ai/dsh-jobs': 'packages/jobs/jobs',
  '@deepseek-ai/dsh-system-prompt': 'packages/core/system-prompt',
  '@deepseek-ai/dsh-scope': 'packages/core/scope',
  '@deepseek-ai/dsh-util-values': 'packages/util/values',
}

/** Toolchain packages taken from the checkout's own node_modules. */
const TOOLCHAIN = ['typescript', 'vitest', '@types/node']

function link(source, target) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, 'dir')
}

if (!existsSync(join(checkout, 'package.json'))) {
  console.error(`link-dev-deps: no dsh checkout at ${checkout} (set DSH_CHECKOUT)`)
  process.exit(1)
}

for (const [name, relative] of Object.entries(DSH_PACKAGES)) {
  const source = join(checkout, relative)
  if (!existsSync(join(source, 'package.json'))) {
    console.error(`link-dev-deps: ${name} not found at ${source}`)
    process.exit(1)
  }
  link(source, join(root, 'node_modules', ...name.split('/')))
}

for (const name of TOOLCHAIN) {
  const source = join(checkout, 'node_modules', ...name.split('/'))
  if (!existsSync(source)) {
    console.error(`link-dev-deps: ${name} not present in the checkout's node_modules`)
    process.exit(1)
  }
  link(source, join(root, 'node_modules', ...name.split('/')))
}

for (const binary of ['vitest', 'tsc']) {
  const source = join(checkout, 'node_modules', '.bin', binary)
  const target = join(root, 'node_modules', '.bin', binary)
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { force: true })
  symlinkSync(source, target)
}

console.log(`link-dev-deps: node_modules now points at ${checkout}`)
