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
  // Browser-half peers: the client plugins this page mounts beside.
  '@deepseek-ai/dsh-api-remotes': 'packages/api/remotes',
  '@deepseek-ai/dsh-client-locale': 'packages/client/locale',
  '@deepseek-ai/dsh-client-store': 'packages/client/store',
  '@deepseek-ai/dsh-client-ui-plugin-manager': 'packages/client/ui-plugin-manager',
  '@deepseek-ai/dsh-client-ui-primitives': 'packages/client/ui-primitives',
  '@deepseek-ai/dsh-client-ui-renderer': 'packages/client/ui-renderer',
  '@deepseek-ai/dsh-client-ui-settings': 'packages/client/ui-settings',
  '@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots',
}

/** React and its types live beside the client packages that declare them. */
const REACT_PACKAGES = ['react', 'react-dom', '@types/react']

/** Toolchain packages taken from the checkout's own node_modules. */
const TOOLCHAIN = ['typescript', 'vitest', '@types/node']

/** Bundler used by build/client-bundle.mjs, taken from the checkout's store. */
const ROLldown = 'rolldown'

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

for (const name of REACT_PACKAGES) {
  const source = join(checkout, 'packages', 'client', 'ui-primitives', 'node_modules', ...name.split('/'))
  if (!existsSync(source)) {
    console.error(`link-dev-deps: ${name} not present beside packages/client/ui-primitives`)
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

// rolldown ships under pnpm's content store; resolve whichever version the
// checkout holds rather than pinning one here.
const { readdirSync } = await import('node:fs')
const store = join(checkout, 'node_modules', '.pnpm')
if (existsSync(store)) {
  const candidate = readdirSync(store).filter(name => name.startsWith('rolldown@')).sort().at(-1)
  if (candidate !== undefined) {
    link(join(store, candidate, 'node_modules', ROLldown), join(root, 'node_modules', ROLldown))
  }
}

for (const binary of ['vitest', 'tsc']) {
  const source = join(checkout, 'node_modules', '.bin', binary)
  const target = join(root, 'node_modules', '.bin', binary)
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { force: true })
  symlinkSync(source, target)
}

console.log(`link-dev-deps: node_modules now points at ${checkout}`)
