import { describe, expect, it } from 'vitest'
import { projectCatalog, renderCatalog } from '../src/catalog.ts'
import { inspectRoleConfig } from '../src/settings.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

function settings(): RoleConfigSettings {
  return plainSettings({
    pool: [
      { provider: 'deepseek', model: 'deepseek-chat', label: 'Chat', description: 'cheap and quick' },
      { provider: 'deepseek', model: 'deepseek-reasoner', description: 'slow but thorough' },
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
      }],
    }],
  })
}

describe('role-config catalog projection', () => {
  it('describes roles by name and description only, never by their members', () => {
    const view = projectCatalog(settings(), [])
    expect(view.roles).toEqual([
      { id: 'premium', label: 'Premium', description: 'hard problems', group: 'Tier' },
    ])
    // The projection is the model's only view of a role: assert the members
    // the operator configured are not reachable through it.
    const serialized = JSON.stringify(view.roles)
    expect(serialized).not.toContain('deepseek-reasoner')
    expect(serialized).not.toContain('chain')
    expect(view.models).toEqual([
      { provider: 'deepseek', model: 'deepseek-chat', label: 'Chat', description: 'cheap and quick' },
      { provider: 'deepseek', model: 'deepseek-reasoner', label: 'deepseek-reasoner', description: 'slow but thorough' },
    ])
  })

  it('carries configuration problems alongside the catalog', () => {
    const problems = inspectRoleConfig(plainSettings({ delegate: { provider: '', toolName: 'subagent', enableRunInBackground: true } }))
    const view = projectCatalog(settings(), problems)
    expect(view.problems).toEqual(['delegate.provider: the delegation tool needs a subagent provider name'])
    expect(renderCatalog(view)).toContain('Configuration problems the operator should fix:')
  })

  it('renders roles before models with the delegation command named', () => {
    const text = renderCatalog(projectCatalog(settings(), []))
    expect(text).toContain('role=<id>')
    expect(text).toContain('- premium [Tier] Premium: hard problems')
    expect(text).toContain('- deepseek/deepseek-chat (Chat): cheap and quick')
    expect(text.indexOf('premium')).toBeLessThan(text.indexOf('deepseek-chat'))
  })

  it('says so when nothing is configured', () => {
    const text = renderCatalog(projectCatalog(plainSettings(), []))
    expect(text).toBe('No role presets and no model pool are configured on this deployment yet.')
  })
})
