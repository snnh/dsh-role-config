import { describe, expect, it } from 'vitest'
import {
  chainHead,
  conditionMatches,
  fallbackOrder,
  indexPool,
  indexRoles,
  selectByRules,
} from '../src/routing.ts'
import type { FactsLookup, RouteFacts } from '../src/routing.ts'
import type { RouteMember } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

/** Facts for one route, spelled out per test. */
function facts(over: Partial<RouteFacts> = {}): RouteFacts {
  return { modalities: undefined, contextWindow: undefined, tags: new Set<string>(), ...over }
}

/** A lookup answering per `provider/model` key. */
function lookup(table: Record<string, RouteFacts>): FactsLookup {
  return (route: RouteMember) => table[`${route.provider}/${route.model}`] ?? facts()
}

const POOL = [
  { provider: 'a', model: 'text-only', description: 'cheap' },
  { provider: 'a', model: 'vision', description: 'reads images' },
  { provider: 'b', model: 'long', description: 'huge context', capabilities: ['long-context'] },
]

describe('role-config routing rules', () => {
  it('matches prompt substrings case-insensitively', () => {
    expect(conditionMatches({ promptAny: ['screenshot'] }, 'Read the SCREENSHOT and fix the layout.', facts())).toBe(true)
    expect(conditionMatches({ promptAny: ['screenshot'] }, 'refactor the parser', facts())).toBe(false)
    expect(conditionMatches({ promptAny: ['one', 'two'] }, 'two things', facts())).toBe(true)
  })

  it('matches a regular expression against the prompt', () => {
    expect(conditionMatches({ promptRegex: '\\b(png|jpe?g)\\b' }, 'inspect chart.png', facts())).toBe(true)
    expect(conditionMatches({ promptRegex: '^audit' }, 'please audit', facts())).toBe(false)
  })

  it('requires every declared modality, and skips routes whose catalog is silent', () => {
    expect(conditionMatches({ modalities: ['image'] }, '', facts({ modalities: new Set(['text', 'image']) }))).toBe(true)
    expect(conditionMatches({ modalities: ['image'] }, '', facts({ modalities: new Set(['text']) }))).toBe(false)
    // Undisclosed modalities are unknown, never a capability the rule may assume.
    expect(conditionMatches({ modalities: ['image'] }, '', facts())).toBe(false)
  })

  it('enforces a minimum context window only when the catalog discloses one', () => {
    expect(conditionMatches({ minContextWindow: 200_000 }, '', facts({ contextWindow: 256_000 }))).toBe(true)
    expect(conditionMatches({ minContextWindow: 200_000 }, '', facts({ contextWindow: 128_000 }))).toBe(false)
    expect(conditionMatches({ minContextWindow: 200_000 }, '', facts())).toBe(false)
  })

  it('reads user capability tags', () => {
    expect(conditionMatches({ capabilities: ['long-context'] }, '', facts({ tags: new Set(['long-context']) }))).toBe(true)
    expect(conditionMatches({ capabilities: ['long-context'] }, '', facts())).toBe(false)
  })

  it('takes the first matching rule, and none when nothing matches', () => {
    const role = {
      id: 'premium',
      label: 'Premium',
      chain: [{ provider: 'a', model: 'vision' }, { provider: 'a', model: 'text-only' }],
      rules: [
        { when: { promptAny: ['diagram'] }, use: { provider: 'a', model: 'text-only' } },
        { when: { promptAny: ['image', 'attachment'], modalities: ['image'] }, use: { provider: 'a', model: 'vision' } },
      ],
    }
    const table = lookup({
      'a/vision': facts({ modalities: new Set(['text', 'image']) }),
      'a/text-only': facts({ modalities: new Set(['text']) }),
    })
    expect(selectByRules(role, 'describe the diagram', table)?.member)
      .toEqual({ provider: 'a', model: 'text-only' })
    expect(selectByRules(role, 'look at attachment.png', table)?.member)
      .toEqual({ provider: 'a', model: 'vision' })
    expect(selectByRules(role, 'write a unit test', table)).toBeUndefined()
    expect(chainHead(role)).toEqual({ provider: 'a', model: 'vision' })
  })

  it('serves the chosen member first and then the rest of the chain', () => {
    const role = {
      id: 'r',
      label: 'R',
      chain: [
        { provider: 'a', model: 'one' },
        { provider: 'a', model: 'two' },
        { provider: 'a', model: 'three' },
      ],
    }
    expect(fallbackOrder(role, { provider: 'a', model: 'two' })).toEqual([
      { provider: 'a', model: 'two' },
      { provider: 'a', model: 'one' },
      { provider: 'a', model: 'three' },
    ])
    expect(fallbackOrder(role, undefined)).toEqual(role.chain)
  })

  it('indexes roles and pool entries from a settings snapshot', () => {
    const settings = plainSettings({
      pool: POOL,
      roles: [
        { id: 'fast', label: 'Fast', chain: [{ provider: 'a', model: 'text-only' }] },
        { id: 'fast', label: 'Shadowed', chain: [] },
      ],
    })
    const roles = indexRoles(settings)
    expect(roles.get('fast')?.label).toBe('Fast')
    expect(indexPool(settings).size).toBe(3)
  })
})
