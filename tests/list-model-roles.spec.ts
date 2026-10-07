import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { LIST_ROLES_TOOL_NAME, registerListRolesTool } from '../src/tools/list-model-roles.ts'
import { inspectRoleConfig } from '../src/settings.ts'
import type { RoleConfigProblem, RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

const SIGNAL = new AbortController().signal
let counter = 0

/** Mount the real tool runtime, register the listing tool, and execute it. */
async function call(
  settings: RoleConfigSettings,
  problems: readonly RoleConfigProblem[] = [],
): Promise<{ raw: unknown; text: string }> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  registerListRolesTool(ctx, { settings: () => settings, problems: () => problems })
  const result = await ctx.tools.execute({
    signal: SIGNAL,
    callId: ToolCallId(`call-${++counter}`),
    name: LIST_ROLES_TOOL_NAME,
    arguments: {},
  })
  if (result.isError) throw new Error(`tool failed: ${JSON.stringify(result)}`)
  return {
    raw: result.value,
    text: result.content.filter(block => block.type === 'text').map(block => block.text).join(''),
  }
}

const SETTINGS = plainSettings({
  pool: [{ provider: 'a', model: 'm', description: 'does small edits' }],
  groups: [{
    id: 'tier',
    label: 'Tier',
    roles: [{
      id: 'fast',
      label: 'Fast',
      description: 'quick scoped work',
      chain: [{ provider: 'a', model: 'm' }],
    }],
  }],
})

describe('list_model_roles', () => {
  it('registers a parameterless tool whose schema carries the name', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    registerListRolesTool(ctx, { settings: () => SETTINGS, problems: () => [] })
    const schema = ctx.tools.schemas().find(candidate => candidate.name === LIST_ROLES_TOOL_NAME)
    expect(schema).toBeDefined()
    expect(Object.keys((schema?.parameters as { properties?: object }).properties ?? {})).toEqual([])
  })

  it('returns roles and pool models, and never a role member', async () => {
    const { raw, text } = await call(SETTINGS)
    expect(raw).toEqual({
      roles: [{ id: 'fast', label: 'Fast', description: 'quick scoped work', group: 'Tier' }],
      models: [{ provider: 'a', model: 'm', label: 'm', description: 'does small edits' }],
      problems: [],
    })
    expect(text).toContain('- fast [Tier] Fast: quick scoped work')
    expect(text).toContain('- a/m: does small edits')
  })

  it('passes configuration problems through to the model', async () => {
    const problems = inspectRoleConfig(plainSettings({ delegate: { provider: ' ', toolName: 'subagent', enableRunInBackground: true } }))
    const { raw, text } = await call(SETTINGS, problems)
    expect((raw as { problems: string[] }).problems)
      .toEqual(['delegate.provider: the delegation tool needs a subagent provider name'])
    expect(text).toContain('Configuration problems the operator should fix:')
  })

  it('reports an unconfigured deployment instead of an empty list', async () => {
    const { text } = await call(plainSettings())
    expect(text).toBe('No role presets and no model pool are configured on this deployment yet.')
  })
})
