import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import { defineTool } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { apply, settingsSnapshot } from '../src/index.ts'
import type { Config } from '../src/index.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

/** Wrap a plain settings value in the live references the plugin reads. */
function liveConfig(settings: RoleConfigSettings): Config {
  return {
    pool: { get: () => settings.pool },
    roles: { get: () => settings.roles },
    bindings: { get: () => settings.bindings },
    exposure: { get: () => settings.exposure },
    routing: { get: () => settings.routing },
    delegate: { get: () => settings.delegate },
  } as unknown as Config
}

/** One fake agent: an id, a session header, and its own scope context. */
function fakeAgent(ctx: Context, id: string, header: Record<string, unknown>): Agent {
  const scope = createScope(ctx, id as never)
  return { id, ctx: scope.ctx, session: { header } } as unknown as Agent
}

/** Mount the plugin over a fake agent registry and report what it installed. */
async function mount(settings: RoleConfigSettings): Promise<{
  ctx: Context
  top: Agent
  child: Agent
}> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const top = fakeAgent(ctx, 'top-1', { origin: undefined, delegationDepth: 0 })
  const child = fakeAgent(ctx, 'child-1', { origin: 'subagent', delegationDepth: 1 })
  ctx.provide('agents', { list: () => [top, child], get: () => undefined } as never)
  // The delegation tool registers through an injected child that waits for the
  // subagent seam; a deployment without it gets the catalog tool only.
  ctx.provide('subagents', { getProvider: () => undefined, resolveMaxDepth: () => 1 } as never)
  apply(ctx, liveConfig(settings))
  // Registrations land through injected children; let those fibers activate.
  await new Promise(resolve => setTimeout(resolve, 0))
  return { ctx, top, child }
}

/** Tool names visible in one agent's scope. */
function namesIn(ctx: Context, agent: Agent): string[] {
  return ctx.tools.schemas(agent.id as never).map(schema => schema.name).sort()
}

/** Let the deferred delegation-tool registration run. */
const settle = (): Promise<void> => new Promise(resolve => { setTimeout(resolve, 1) })

const ROLES = {
  pool: [{ provider: 'a', model: 'cheap', description: 'quick' }],
  roles: [
    { id: 'fast', label: 'Fast', chain: [{ provider: 'a', model: 'cheap' }] },
  ],
}

describe('role-config plugin wiring', () => {
  it('reads a detached snapshot from the live references', () => {
    const settings = plainSettings(ROLES)
    expect(settingsSnapshot(liveConfig(settings))).toEqual(settings)
  })

  it('serves the catalog to the main agent and the delegation tool to every agent', async () => {
    const { ctx, top, child } = await mount(plainSettings(ROLES))
    // The delegation tool lands after the agent's composition settles: the
    // official tool can install itself into that same scope, and yielding to
    // it is what keeps session creation from failing on a duplicate name.
    await settle()
    expect(namesIn(ctx, top)).toEqual(['list_model_roles', 'subagent'])
    // A delegated child may delegate further, but never sees the pool catalog.
    expect(namesIn(ctx, child)).toEqual(['subagent'])
  })

  it('leaves a tool that already owns the name alone instead of throwing', async () => {
    const { ctx, top } = await mount(plainSettings(ROLES))
    // Stand in for the official tool a preset installs into the agent's scope
    // while the composition runs.
    top.ctx.inject(['tools'], (scope) => {
      scope.tools.register(defineTool({
        name: 'subagent',
        description: 'the official delegation tool',
        parameters: {},
        execute: () => Promise.resolve({ ok: true }),
      }))
    })
    await settle()
    expect(namesIn(ctx, top).filter(name => name === 'subagent')).toHaveLength(1)
  })

  it('honours the exposure switches', async () => {
    const { ctx, top, child } = await mount(plainSettings({
      ...ROLES,
      exposure: { listTool: false, sessionStart: false, delegateTool: false },
    }))
    await settle()
    expect(namesIn(ctx, top)).toEqual([])
    expect(namesIn(ctx, child)).toEqual([])
  })

  it('honours the exposure switches', async () => {
    const { ctx, top, child } = await mount(plainSettings({
      ...ROLES,
      exposure: { listTool: false, sessionStart: false, delegateTool: false },
    }))
    expect(namesIn(ctx, top)).toEqual([])
    expect(namesIn(ctx, child)).toEqual([])
  })
})
