import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { createScope } from '@deepseek-ai/dsh-scope'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { CapabilityDirectory } from '../src/capabilities.ts'
import { FailoverRegistry } from '../src/failover.ts'
import { DelegationPlanner } from '../src/plan.ts'
import { registerDelegateTool } from '../src/tools/delegate.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

const SIGNAL = new AbortController().signal
let counter = 0

/** What one fake child run captured. */
interface StartedRun {
  readonly providerName: string
  readonly request: Record<string, unknown>
}

/** A parent agent: route options plus a session the tool may read. */
function parentAgent(): Agent {
  return {
    id: 'parent-1',
    options: { provider: 'a', model: 'parent-model' },
    session: { requestHeader: () => undefined },
  } as unknown as Agent
}

/** Mount the real tool runtime over fake subagent and job services. */
async function harness(settings: RoleConfigSettings, options: { jobs?: boolean } = {}): Promise<{
  ctx: Context
  started: StartedRun[]
  child: Agent
  definition: { execute(args: unknown, exec: ToolRunContext): Promise<unknown> }
  failover: FailoverRegistry
  scopeKey: never
}> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const started: StartedRun[] = []
  const child = { id: 'child-1' } as unknown as Agent
  ctx.provide('subagents', {
    getProvider: (name: string) => (name === 'spawn' ? { name: 'spawn' } : undefined),
    resolveMaxDepth: () => 1,
    start: (providerName: string, request: Record<string, unknown>) => {
      started.push({ providerName, request })
      return Promise.resolve({
        id: 'child-1',
        localAgent: child,
        result: Promise.resolve({ output: [{ type: 'text', text: 'done' }], stopReason: 'completed' }),
        dispose: () => Promise.resolve(),
      })
    },
  } as never)
  if (options.jobs === true) {
    ctx.provide('jobs', {
      start: (spec: { kind: string; label: string; owner: string }) => `job-${spec.kind}-${spec.owner}`,
    } as never)
  }
  const planner = new DelegationPlanner(() => settings, new CapabilityDirectory(undefined), undefined, { warn: () => undefined })
  const failover = new FailoverRegistry({ warn: () => undefined }, () => settings.routing.fallback)
  const scopeKey = 'agent-scope-1' as never
  const scope = createScope(ctx, scopeKey)
  // Register the way the plugin does: through the agent scope's injected
  // child, which is what carries the `tools` service.
  let found: { execute(args: unknown, exec: ToolRunContext): Promise<unknown> } | undefined
  const ready = new Promise<void>((resolve) => {
    scope.ctx.inject(['tools', 'subagents'], (toolCtx) => {
      registerDelegateTool(toolCtx, {
        settings: () => settings,
        planner,
        failover,
        warn: () => undefined,
      })
      found = toolCtx.tools.get(settings.delegate.toolName, scopeKey) as typeof found
      resolve()
    })
  })
  await ready
  if (found === undefined) throw new Error('delegation tool did not register')
  return { ctx, started, child, definition: found, failover, scopeKey }
}

/** Call the tool body the way the registry would. */
function call(
  definition: { execute(args: unknown, exec: ToolRunContext): Promise<unknown> },
  args: Record<string, unknown>,
  agent = parentAgent(),
): Promise<unknown> {
  return definition.execute(args, {
    signal: SIGNAL,
    callId: ToolCallId(`call-${++counter}`),
    name: 'subagent',
    arguments: args,
    agent,
  } as unknown as ToolRunContext)
}

const ROLES = {
  roles: [
    {
          id: 'fast',
          label: 'Fast',
          chain: [{ provider: 'a', model: 'cheap' }, { provider: 'a', model: 'fallback' }],
        },
  ],
  pool: [
    { provider: 'a', model: 'cheap', description: 'quick' },
    { provider: 'a', model: 'fallback', description: 'backup' },
  ],
}

describe('role-config delegation tool', () => {
  it('registers under the official name with the official surface plus role and route', async () => {
    const settings = plainSettings(ROLES)
    const { ctx, scopeKey } = await harness(settings)
    const schema = ctx.tools.schemas(scopeKey).find(candidate => candidate.name === 'subagent')
    expect(schema).toBeDefined()
    const properties = (schema?.parameters as { properties?: Record<string, unknown> }).properties ?? {}
    expect(Object.keys(properties).sort()).toEqual(
      ['description', 'model', 'prompt', 'provider', 'role', 'run_in_background'].sort(),
    )
  })

  it('starts a role delegation on the chain head and returns the child output', async () => {
    const settings = plainSettings(ROLES)
    const { definition, started, child, failover } = await harness(settings)
    const value = await call(definition, { description: 'tidy docs', prompt: 'tidy the docs', role: 'fast' })
    expect(value).toEqual({ kind: 'foreground', runId: 'child-1', output: [{ type: 'text', text: 'done' }] })
    expect(started).toHaveLength(1)
    expect(started[0]?.providerName).toBe('spawn')
    expect(started[0]?.request.agentOptions).toEqual({ provider: 'a', model: 'cheap' })
    expect(started[0]?.request.label).toBe('tidy docs')
    expect(started[0]?.request.prompt).toEqual([{ type: 'text', text: 'tidy the docs' }])
    // The child is tracked for priority failover.
    expect(failover.tracks(child)).toBe(true)
  })

  it('starts a direct delegation on the named pool route, without failover tracking', async () => {
    const settings = plainSettings(ROLES)
    const { definition, started, child, failover } = await harness(settings)
    await call(definition, { description: 'x', prompt: 'do it', provider: 'a', model: 'fallback' })
    expect(started[0]?.request.agentOptions).toEqual({ provider: 'a', model: 'fallback' })
    expect(failover.tracks(child)).toBe(false)
  })

  it('inherits the parent route when the model names nothing', async () => {
    const settings = plainSettings({ pool: ROLES.pool })
    const { definition, started } = await harness(settings)
    await call(definition, { description: 'x', prompt: 'do it' })
    expect(started[0]?.request.agentOptions).toBeUndefined()
  })

  it('refuses a route outside the pool and an unknown role', async () => {
    const settings = plainSettings(ROLES)
    const { definition } = await harness(settings)
    await expect(call(definition, { description: 'x', prompt: 'p', provider: 'z', model: 'nope' }))
      .rejects.toThrow(/not in the operator's model pool/)
    await expect(call(definition, { description: 'x', prompt: 'p', role: 'ghost' }))
      .rejects.toThrow(/unknown role "ghost"/)
  })

  it('refuses a delegation when the configured provider is not registered', async () => {
    const settings = plainSettings({ ...ROLES, delegate: { provider: 'missing', toolName: 'subagent', enableRunInBackground: true } })
    const { definition } = await harness(settings)
    await expect(call(definition, { description: 'x', prompt: 'p', role: 'fast' }))
      .rejects.toThrow(/subagent provider "missing" is not registered/)
  })

  it('runs a background delegation through the job service', async () => {
    const settings = plainSettings(ROLES)
    const { definition } = await harness(settings, { jobs: true })
    const value = await call(definition, { description: 'x', prompt: 'p', role: 'fast', run_in_background: true })
    expect(value).toEqual({ kind: 'background', jobId: 'job-subagent-parent-1' })
  })

  it('reports missing background support instead of pretending', async () => {
    const settings = plainSettings(ROLES)
    const { definition } = await harness(settings)
    await expect(call(definition, { description: 'x', prompt: 'p', role: 'fast', run_in_background: true }))
      .rejects.toThrow(/background jobs unavailable/)
  })
})
