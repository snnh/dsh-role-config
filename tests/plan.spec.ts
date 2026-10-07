import { describe, expect, it } from 'vitest'
import { CapabilityDirectory } from '../src/capabilities.ts'
import { DelegationPlanner } from '../src/plan.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

const SIGNAL = new AbortController().signal

interface FakeModel {
  readonly provider: string
  readonly id: string
  readonly name: string
  readonly inputModalities?: readonly string[]
  readonly context?: { readonly contextWindow: number }
}

/** A minimal LLM service: an adapter catalog plus an optional router answer. */
function fakeLlm(models: readonly FakeModel[], answer?: string): {
  listProviders(): { id: string; name: string }[]
  resolveModelInfo(provider: string, model: string): Promise<FakeModel>
  stream(): AsyncIterable<unknown>
} {
  return {
    listProviders: () => [...new Set(models.map(model => model.provider))]
      .map(id => ({ id, name: id.toUpperCase() })),
    resolveModelInfo: (provider: string, model: string) => {
      const found = models.find(candidate => candidate.provider === provider && candidate.id === model)
      if (found === undefined) return Promise.reject(new Error(`no adapter for ${provider}/${model}`))
      return Promise.resolve(found)
    },
    stream: () => (async function* stream() {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: answer ?? '' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: answer ?? '' } }
      yield { type: 'finish', reason: 'stop' }
    })(),
  }
}

function plannerFor(settings: RoleConfigSettings, llm?: unknown): DelegationPlanner {
  const service = llm as never ?? undefined
  return new DelegationPlanner(
    () => settings,
    new CapabilityDirectory(service),
    service,
    { warn: () => undefined },
  )
}

const POOL = [
  { provider: 'a', model: 'text-only', description: 'cheap' },
  { provider: 'a', model: 'vision', description: 'reads screenshots' },
]

describe('role-config delegation planning', () => {
  it('serves the chain head when nothing else decides', async () => {
    const settings = plainSettings({
      pool: POOL,
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{
          id: 'fast',
          label: 'Fast',
          chain: [{ provider: 'a', model: 'text-only' }, { provider: 'a', model: 'vision' }],
        }],
      }],
    })
    const plan = await plannerFor(settings).plan({ prompt: 'tidy the changelog', role: 'fast' }, SIGNAL)
    expect(plan).toEqual({
      route: { provider: 'a', model: 'text-only' },
      chain: [{ provider: 'a', model: 'text-only' }, { provider: 'a', model: 'vision' }],
      role: 'fast',
      source: 'chain',
    })
  })

  it('lets a condition rule pick the multimodal member over the head', async () => {
    const settings = plainSettings({
      pool: POOL,
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{
          id: 'review',
          label: 'Review',
          chain: [{ provider: 'a', model: 'text-only' }, { provider: 'a', model: 'vision' }],
          rules: [{ when: { promptAny: ['screenshot'], modalities: ['image'] }, use: { provider: 'a', model: 'vision' } }],
        }],
      }],
    })
    const llm = fakeLlm([
      { provider: 'a', id: 'text-only', name: 'Text', inputModalities: ['text'] },
      { provider: 'a', id: 'vision', name: 'Vision', inputModalities: ['text', 'image'] },
    ])
    const plan = await plannerFor(settings, llm).plan({ prompt: 'check this screenshot', role: 'review' }, SIGNAL)
    expect(plan.route).toEqual({ provider: 'a', model: 'vision' })
    expect(plan.source).toBe('rule')
    // The chosen member leads the fallback order; the rest of the chain follows.
    expect(plan.chain).toEqual([
      { provider: 'a', model: 'vision' },
      { provider: 'a', model: 'text-only' },
    ])
  })

  it('skips a rule whose capability the member cannot prove', async () => {
    const settings = plainSettings({
      pool: POOL,
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{
          id: 'review',
          label: 'Review',
          chain: [{ provider: 'a', model: 'text-only' }, { provider: 'a', model: 'vision' }],
          rules: [{ when: { promptAny: ['screenshot'], modalities: ['image'] }, use: { provider: 'a', model: 'text-only' } }],
        }],
      }],
    })
    const llm = fakeLlm([
      { provider: 'a', id: 'text-only', name: 'Text', inputModalities: ['text'] },
      { provider: 'a', id: 'vision', name: 'Vision', inputModalities: ['text', 'image'] },
    ])
    const plan = await plannerFor(settings, llm).plan({ prompt: 'check this screenshot', role: 'review' }, SIGNAL)
    expect(plan.route).toEqual({ provider: 'a', model: 'text-only' })
    expect(plan.source).toBe('chain')
  })

  it('asks the router only when no rule matched and AI routing is on', async () => {
    const settings = plainSettings({
      pool: POOL,
      routing: { fallback: true, aiEnabled: true, aiProvider: 'a', aiModel: 'text-only', aiTimeoutMs: 1000 },
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{
          id: 'fast',
          label: 'Fast',
          chain: [{ provider: 'a', model: 'text-only' }, { provider: 'a', model: 'vision' }],
        }],
      }],
    })
    const llm = fakeLlm([
      { provider: 'a', id: 'text-only', name: 'Text' },
      { provider: 'a', id: 'vision', name: 'Vision' },
    ], 'a/vision')
    const plan = await plannerFor(settings, llm).plan({ prompt: 'compare two screenshots', role: 'fast' }, SIGNAL)
    expect(plan.route).toEqual({ provider: 'a', model: 'vision' })
    expect(plan.source).toBe('ai')
  })

  it('falls back to the chain head when the router answers nothing usable', async () => {
    const settings = plainSettings({
      pool: POOL,
      routing: { fallback: true, aiEnabled: true, aiProvider: 'a', aiModel: 'text-only', aiTimeoutMs: 1000 },
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{ id: 'fast', label: 'Fast', chain: [{ provider: 'a', model: 'text-only' }] }],
      }],
    })
    const llm = fakeLlm([{ provider: 'a', id: 'text-only', name: 'Text' }], 'no idea')
    const plan = await plannerFor(settings, llm).plan({ prompt: 'anything', role: 'fast' }, SIGNAL)
    expect(plan.source).toBe('chain')
    expect(plan.route).toEqual({ provider: 'a', model: 'text-only' })
  })

  it('accepts a direct pool route and refuses anything else', async () => {
    const settings = plainSettings({ pool: POOL })
    const planner = plannerFor(settings)
    const plan = await planner.plan({ prompt: 'x', provider: 'a', model: 'vision' }, SIGNAL)
    expect(plan).toEqual({
      route: { provider: 'a', model: 'vision' },
      chain: [{ provider: 'a', model: 'vision' }],
      source: 'direct',
    })
    await expect(planner.plan({ prompt: 'x', provider: 'a', model: 'ghost' }, SIGNAL))
      .rejects.toThrow(/a\/ghost is not in the operator's model pool/)
    await expect(planner.plan({ prompt: 'x', provider: 'a' }, SIGNAL))
      .rejects.toThrow(/`provider` and `model` must be supplied together/)
    await expect(planner.plan({ prompt: 'x', role: 'fast', provider: 'a', model: 'vision' }, SIGNAL))
      .rejects.toThrow(/not both/)
  })

  it('uses the configured default role when the model names nothing', async () => {
    const settings = plainSettings({
      pool: POOL,
      bindings: {
        compact: { kind: 'off' },
        sessionTitle: { kind: 'off' },
        delegateDefault: { kind: 'role', role: 'fast' },
      },
      groups: [{
        id: 'tier',
        label: 'Tier',
        roles: [{ id: 'fast', label: 'Fast', chain: [{ provider: 'a', model: 'text-only' }] }],
      }],
    })
    const plan = await plannerFor(settings).plan({ prompt: 'anything' }, SIGNAL)
    expect(plan.role).toBe('fast')
    expect(plan.source).toBe('chain')
  })

  it('inherits the parent route when nothing is configured for the request', async () => {
    const plan = await plannerFor(plainSettings()).plan({ prompt: 'anything' }, SIGNAL)
    expect(plan).toEqual({ chain: [], source: 'inherit' })
  })

  it('reports an unknown role and an empty role', async () => {
    const settings = plainSettings({
      groups: [{ id: 'tier', label: 'Tier', roles: [{ id: 'empty', label: 'Empty', chain: [] }] }],
    })
    const planner = plannerFor(settings)
    await expect(planner.plan({ prompt: 'x', role: 'ghost' }, SIGNAL))
      .rejects.toThrow(/unknown role "ghost"/)
    await expect(planner.plan({ prompt: 'x', role: 'empty' }, SIGNAL))
      .rejects.toThrow(/has no members yet/)
  })
})
