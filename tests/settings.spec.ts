import { describe, expect, it } from 'vitest'
import { Config, assertRoleConfig, conditionIsEmpty, inspectRoleConfig } from '../src/settings.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

/** Settings with defaults resolved, plus whatever the test states. */
function resolved(over: Record<string, unknown> = {}): RoleConfigSettings {
  return plainSettings(over as Partial<RoleConfigSettings>)
}

/** One sound document: a pool, a role with a rule, and a binding. */
function sound(): RoleConfigSettings {
  return resolved({
    pool: [
      { provider: 'deepseek', model: 'deepseek-chat', description: 'fast and cheap' },
      { provider: 'deepseek', model: 'deepseek-reasoner', description: 'deep reasoning', capabilities: ['long-context'] },
    ],
    groups: [{
      id: 'tier',
      label: 'Tier',
      roles: [{
        id: 'premium',
        label: 'Premium',
        description: 'hard problems',
        chain: [
          { provider: 'deepseek', model: 'deepseek-reasoner' },
          { provider: 'deepseek', model: 'deepseek-chat' },
        ],
        rules: [{
          when: { promptAny: ['image'] },
          use: { provider: 'deepseek', model: 'deepseek-chat' },
        }],
      }],
    }],
    bindings: { compact: { kind: 'role', role: 'premium' } },
  })
}

describe('role-config settings', () => {
  it('resolves every field to its default when a deployment states nothing', () => {
    const settings = Config({})
    expect(settings.pool.get()).toEqual([])
    expect(settings.groups.get()).toEqual([])
    expect(settings.bindings.get()).toEqual({
      compact: { kind: 'off' }, sessionTitle: { kind: 'off' }, delegateDefault: { kind: 'off' },
    })
    expect(settings.exposure.get()).toEqual({ listTool: true, sessionStart: false, delegateTool: true })
    expect(settings.routing.get()).toEqual({
      fallback: true, aiEnabled: false, aiProvider: undefined, aiModel: undefined, aiTimeoutMs: 8000,
    })
    expect(settings.delegate.get()).toEqual({ provider: 'spawn', toolName: 'subagent', enableRunInBackground: true })
  })

  it('accepts a sound document', () => {
    expect(inspectRoleConfig(sound())).toEqual([])
    expect(() => { assertRoleConfig(sound()) }).not.toThrow()
  })

  it('reports duplicate pool entries and unnamed ones', () => {
    const problems = inspectRoleConfig(resolved({
      pool: [
        { provider: 'a', model: 'm', description: '' },
        { provider: 'a', model: 'm', description: '' },
        { provider: '', model: 'm', description: '' },
      ],
    }))
    expect(problems.map(problem => problem.message)).toEqual([
      'duplicate pool entry for a/m (also at pool.0)',
      'a pool entry needs both a provider and a model',
    ])
  })

  it('reports chain members outside the pool and repeated members', () => {
    const settings = resolved({
      pool: [{ provider: 'a', model: 'm', description: '' }],
      groups: [{
        id: 'g',
        label: 'G',
        roles: [{
          id: 'r',
          label: 'R',
          chain: [
            { provider: 'a', model: 'm' },
            { provider: 'ghost', model: 'm' },
            { provider: 'a', model: 'm' },
          ],
        }],
      }],
    })
    const messages = inspectRoleConfig(settings).map(problem => `${problem.path}: ${problem.message}`)
    expect(messages).toEqual([
      'groups.0.roles.0.chain.1: ghost/m is not in the model pool',
      'groups.0.roles.0.chain.2: a/m appears twice in this role',
    ])
  })

  it('reports duplicate role ids across groups', () => {
    const problems = inspectRoleConfig(resolved({
      groups: [
        { id: 'one', label: 'One', roles: [{ id: 'premium', label: 'P', chain: [] }] },
        { id: 'two', label: 'Two', roles: [{ id: 'premium', label: 'P', chain: [] }] },
      ],
    }))
    expect(problems.map(problem => problem.message)).toEqual([
      'duplicate role id "premium" (also at groups.0.roles.0.id)',
    ])
  })

  it('reports a rule whose target is not a member of its role', () => {
    const problems = inspectRoleConfig(resolved({
      pool: [{ provider: 'a', model: 'm', description: '' }],
      groups: [{
        id: 'g',
        label: 'G',
        roles: [{
          id: 'r',
          label: 'R',
          chain: [{ provider: 'a', model: 'm' }],
          rules: [{ when: { promptAny: ['x'] }, use: { provider: 'a', model: 'other' } }],
        }],
      }],
    }))
    expect(problems.map(problem => problem.message)).toEqual([
      'a/other is not a member of role "r"',
    ])
  })

  it('reports a malformed regular expression and an empty condition', () => {
    const problems = inspectRoleConfig(resolved({
      pool: [{ provider: 'a', model: 'm', description: '' }],
      groups: [{
        id: 'g',
        label: 'G',
        roles: [{
          id: 'r',
          label: 'R',
          chain: [{ provider: 'a', model: 'm' }],
          rules: [
            { when: { promptRegex: '(' }, use: { provider: 'a', model: 'm' } },
            { when: {}, use: { provider: 'a', model: 'm' } },
          ],
        }],
      }],
    }))
    const messages = problems.map(problem => `${problem.path}: ${problem.message}`)
    expect(messages[0]).toContain('groups.0.roles.0.rules.0.when.promptRegex: invalid regular expression')
    expect(messages[1]).toBe('groups.0.roles.0.rules.1.when: a rule needs at least one condition')
  })

  it('reports bindings that name no role or an unknown one', () => {
    const problems = inspectRoleConfig(resolved({
      bindings: {
        compact: { kind: 'role' },
        sessionTitle: { kind: 'role', role: 'ghost' },
      },
    }))
    expect(problems.map(problem => problem.message)).toEqual([
      'choose a role or turn this binding off',
      'role "ghost" does not exist',
    ])
  })

  it('reports AI routing without a usable router model or deadline', () => {
    const problems = inspectRoleConfig(resolved({
      routing: { aiEnabled: true, aiTimeoutMs: 0 },
    }))
    expect(problems.map(problem => problem.message)).toEqual([
      'AI routing needs a router model (provider and model together)',
      'the router deadline must be a positive number',
    ])
  })

  it('rejects an unusable document with every problem named', () => {
    expect(() => { assertRoleConfig(resolved({ delegate: { provider: '  ' } })) })
      .toThrow(/delegate\.provider: the delegation tool needs a subagent provider name/)
  })

  it('treats a condition with only zero bounds as empty', () => {
    expect(conditionIsEmpty({})).toBe(true)
    expect(conditionIsEmpty({ minContextWindow: 0, promptAny: [] })).toBe(true)
    expect(conditionIsEmpty({ minContextWindow: 1 })).toBe(false)
  })
})
