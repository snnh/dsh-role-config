/**
 * dsh-role-config: role presets and a model pool for delegation.
 *
 * The plugin has two model-visible surfaces, both off until configured. A
 * listing tool answers what roles exist and which pool models the model may
 * name. A delegation tool (registered as `subagent`, shadowing the official
 * one) accepts `role` and lets the operator's routing rules pick the model.
 *
 * A role's members never reach the model: the listing carries names and
 * descriptions only, and routing happens Host-side.
 *
 * @module dsh-role-config
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
// Type-only: the Loader owns the `loader/volatile-update` event used below.
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { CapabilityDirectory } from './capabilities.ts'
import type { RoleCatalogSource } from './tools/list-model-roles.ts'
import { registerListRolesTool } from './tools/list-model-roles.ts'
import { Config as RoleConfigSchema, inspectRoleConfig } from './settings.ts'
import type {
  Bindings,
  DelegateConfig,
  Exposure,
  PoolModel,
  RoleConfigSettings,
  RoleGroup,
  Routing,
} from './settings.ts'

export const name = 'role-config'

/** Services the apply body reads immediately. */
export const inject = ['tools', 'agents']

/**
 * Plugin configuration: every field is a live reference the Plugins page can
 * edit, so a settings write takes effect without remounting the plugin.
 */
export interface Config {
  /** Models the main agent may name directly, with the user's descriptions. */
  pool: Volatile<PoolModel[]>
  /** Role presets, grouped like the tiers they generalize. */
  groups: Volatile<RoleGroup[]>
  /** Per-function role bindings. */
  bindings: Volatile<Bindings>
  /** Model-visible surfaces. */
  exposure: Volatile<Exposure>
  /** Routing behaviour. */
  routing: Volatile<Routing>
  /** Delegation tool wiring. */
  delegate: Volatile<DelegateConfig>
}

/** The plugin's Config schema, exported for the Loader. */
export const Config = RoleConfigSchema

/** Read one detached settings snapshot from the live references. */
export function settingsSnapshot(config: Config): RoleConfigSettings {
  return {
    pool: config.pool.get(),
    groups: config.groups.get(),
    bindings: config.bindings.get(),
    exposure: config.exposure.get(),
    routing: config.routing.get(),
    delegate: config.delegate.get(),
  }
}

/** Whether an agent is a top-level session's agent rather than a delegate. */
export function isTopLevel(agent: Agent): boolean {
  const { header } = agent.session
  return header.origin !== 'subagent' && (header.delegationDepth ?? 0) === 0
}

/**
 * Mount the role-config plugin.
 * @param ctx - the plugin's Host context.
 * @param config - live configuration references.
 */
export function apply(ctx: Context, config: Config): void {
  const source: RoleCatalogSource = {
    settings: () => settingsSnapshot(config),
    problems: () => inspectRoleConfig(settingsSnapshot(config)),
  }
  const llm: LlmRuntime | undefined = ctx.get('llm')
  const capabilities = new CapabilityDirectory(llm)
  // Adapter routes come and go while the Host runs; cached capability facts
  // must not survive that.
  ctx.on('llm/adapters-updated', () => {
    capabilities.invalidate()
  })

  const catalogFibers = new Map<Agent, { dispose: () => Promise<void> }>()

  /**
   * Bring one agent's listing tool in line with the live settings: the pool is
   * the main agent's business, so a delegated child never gets the catalog.
   */
  const reconcileCatalogTool = (agent: Agent): void => {
    const existing = catalogFibers.get(agent)
    if (existing !== undefined) {
      catalogFibers.delete(agent)
      void existing.dispose().catch((error: unknown) => {
        ctx.logger.warn(`role-config: listing tool cleanup failed: ${String(error)}`)
      })
    }
    if (!isTopLevel(agent)) return
    if (!settingsSnapshot(config).exposure.listTool) return
    const fiber = agent.ctx.inject(['tools'], (scope) => {
      registerListRolesTool(scope, source)
    })
    catalogFibers.set(agent, fiber)
  }

  for (const agent of ctx.agents.list()) reconcileCatalogTool(agent)
  ctx.on('agent/created', ({ agent }) => {
    reconcileCatalogTool(agent)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    catalogFibers.delete(agent)
  })
  // A settings write must not need a remount: the tool toggles with its flag.
  ctx.on('loader/volatile-update', () => {
    for (const agent of ctx.agents.list()) reconcileCatalogTool(agent)
  })

  ctx.logger.info('role-config: mounted')
}
