import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CapabilityDirectory } from '../src/capabilities.ts'
import { applyBindings, findBindableRows, resolveBindingRoute } from '../src/bindings.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

const SIGNAL = new AbortController().signal

/** Two pool models, only the second of which an adapter actually serves. */
const POOL = [
  { provider: 'a', model: 'gone', description: 'retired' },
  { provider: 'a', model: 'live', description: 'serving' },
]

const ROLES = {
  pool: POOL,
  groups: [{
    id: 'tier',
    label: 'Tier',
    roles: [{ id: 'cheap', label: 'Cheap', chain: [{ provider: 'a', model: 'gone' }, { provider: 'a', model: 'live' }] }],
  }],
  bindings: {
    compact: { kind: 'role' as const, role: 'cheap' },
    sessionTitle: { kind: 'off' as const },
    delegateDefault: { kind: 'off' as const },
  },
}

/** A loader entry named by the compaction module. */
function compactionEntry(): unknown {
  return { options: { id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic', config: {} } }
}

describe('role-config function bindings', () => {
  it('prefers a member the adapter still serves', async () => {
    const llm = {
      listProviders: () => [{ id: 'a', name: 'A' }],
      resolveModelInfo: (provider: string, model: string) => model === 'live'
        ? Promise.resolve({ provider, id: model, name: model })
        : Promise.reject(new Error('no such model')),
    }
    const directory = new CapabilityDirectory(llm as never)
    const settings = plainSettings(ROLES)
    await directory.prepare(settings, SIGNAL)
    expect(resolveBindingRoute(settings, directory, settings.bindings.compact)).toEqual({ provider: 'a', model: 'live' })
    expect(resolveBindingRoute(settings, directory, { kind: 'off' })).toBeUndefined()
  })

  it('writes the resolved route into the feature row and clears it when unbound', async () => {
    const ctx = new Context()
    const writes: Record<string, unknown>[] = []
    ctx.provide('loader', { entries: () => [compactionEntry()] } as never)
    ctx.provide('configEditor', {
      edit: (_entry: never, change: (current: Record<string, unknown>) => Record<string, unknown>) => {
        writes.push(change(writes.at(-1) ?? {}))
        return Promise.resolve()
      },
    } as never)
    const directory = new CapabilityDirectory(undefined)
    const settings = plainSettings(ROLES)
    await applyBindings({ ctx, settings, capabilities: directory, warn: () => undefined })
    expect(writes.at(-1)).toEqual({ summarizationProvider: 'a', summarizationModel: 'gone' })

    // Turning the binding off clears the pair, restoring the feature default.
    await applyBindings({
      ctx,
      settings: plainSettings({ ...ROLES, bindings: { ...ROLES.bindings, compact: { kind: 'off' } } }),
      capabilities: directory,
      warn: () => undefined,
    })
    expect(writes.at(-1)).toEqual({})
  })

  it('reports the rows it can bind', () => {
    const ctx = new Context()
    ctx.provide('loader', { entries: () => [compactionEntry(), { options: { id: 'x', name: 'other' } }] } as never)
    const rows = findBindableRows(ctx, {
      key: 'compact',
      modules: ['@deepseek-ai/dsh-compaction-basic'],
      fields: ['summarizationProvider', 'summarizationModel'],
      label: 'context compaction',
    })
    expect(rows.map(row => row.id)).toEqual(['compaction-basic'])
  })

  it('keeps quiet when nothing is bound', async () => {
    const ctx = new Context()
    const warnings: string[] = []
    await applyBindings({
      ctx,
      settings: plainSettings() as RoleConfigSettings,
      capabilities: new CapabilityDirectory(undefined),
      warn: message => { warnings.push(message) },
    })
    expect(warnings).toEqual([])
  })
})
