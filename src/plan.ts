/**
 * One delegation request, resolved into the model that serves it and the
 * order the others follow when it fails.
 *
 * Three ways in, in the operator's own priority:
 *
 * 1. `role` — the operator's rules decide (condition rules, then the optional
 *    router model, then the role's priority chain). The model never learns
 *    which route won.
 * 2. `provider` + `model` — the model named a pool member itself.
 * 3. neither — the configured default role, or plain inheritance from the
 *    parent agent, which is what the official tool does.
 *
 * @module dsh-role-config/plan
 */

import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { CapabilityDirectory } from './capabilities.ts'
import { poolEntryOf } from './capabilities.ts'
import { fallbackOrder, indexPool, indexRoles, selectByRules } from './routing.ts'
import { askRouter } from './router.ts'
import type { RouterCandidate, RouterLogger } from './router.ts'
import type { RoleConfigSettings, RouteMember } from './settings.ts'
import { routeKey, routeLabel } from './settings.ts'

/** What the model asked the delegation tool for. */
export interface DelegationRequest {
  /** The task text, passed through to the child. */
  readonly prompt: string
  /** Role id the operator configured, when the model chose a role. */
  readonly role?: string
  /** Provider route the model named directly. */
  readonly provider?: string
  /** Model id the model named directly. */
  readonly model?: string
}

/** How a plan was reached. */
export type PlanSource = 'rule' | 'chain' | 'ai' | 'direct' | 'inherit' | 'default'

/** One resolved delegation. */
export interface DelegationPlan {
  /** Which route serves first, or undefined when the child inherits. */
  readonly route?: RouteMember
  /** Routes in serving order: the primary first, then the rest of the chain. */
  readonly chain: readonly RouteMember[]
  /** The role that produced this plan, when one did. */
  readonly role?: string
  /** How the primary was chosen. */
  readonly source: PlanSource
}

/**
 * Resolve delegation requests against the live settings.
 *
 * Rules and capabilities are read per request: a settings write or a newly
 * configured adapter must be visible on the very next delegation.
 */
export class DelegationPlanner {
  /**
   * @param settings - current settings snapshot reader.
   * @param capabilities - live capability facts for pool routes.
   * @param llm - the LLM service, for the optional router call.
   * @param logger - diagnostic sink.
   */
  constructor(
    private readonly settings: () => RoleConfigSettings,
    private readonly capabilities: CapabilityDirectory,
    private readonly llm: LlmRuntime | undefined,
    private readonly logger: RouterLogger,
  ) {}

  /**
   * Resolve one request.
   * @param request - the model's arguments.
   * @param signal - caller cancellation.
   * @returns the serving route and its fallback order.
   * @throws Error with an actionable message for an unusable request.
   */
  async plan(request: DelegationRequest, signal: AbortSignal): Promise<DelegationPlan> {
    const settings = this.settings()
    const namedRoute = request.provider !== undefined || request.model !== undefined
    if (request.role !== undefined && namedRoute) {
      throw new Error('pass either `role` or `provider` + `model`, not both')
    }
    if (namedRoute) {
      if (request.provider === undefined || request.model === undefined) {
        throw new Error('`provider` and `model` must be supplied together')
      }
      const route: RouteMember = { provider: request.provider, model: request.model }
      if (!indexPool(settings).has(routeKey(route))) {
        throw new Error(`${routeLabel(route)} is not in the operator's model pool; call list_model_roles for the models you may name`)
      }
      return { route, chain: [route], source: 'direct' }
    }

    const requestedRole = request.role
      ?? (settings.bindings.delegateDefault.kind === 'role' ? settings.bindings.delegateDefault.role : undefined)
    if (requestedRole === undefined || requestedRole.length === 0) {
      return { chain: [], source: 'inherit' }
    }
    const role = indexRoles(settings).get(requestedRole)
    if (role === undefined) {
      throw new Error(`unknown role "${requestedRole}"; call list_model_roles for the configured roles`)
    }
    if (role.chain.length === 0) {
      throw new Error(`role "${requestedRole}" has no members yet; the operator must fill it in the settings page`)
    }
    const facts = await this.capabilities.prepare(settings, signal)
    const byRule = selectByRules(role, request.prompt, facts)
    if (byRule !== undefined) {
      return {
        route: byRule.member,
        chain: fallbackOrder(role, byRule.member),
        role: role.id,
        source: 'rule',
      }
    }
    if (settings.routing.aiEnabled) {
      const chosen = await askRouter({
        llm: this.llm,
        logger: this.logger,
        routing: settings.routing,
        roleId: role.id,
        prompt: request.prompt,
        candidates: this.candidates(settings, role.chain),
        signal,
      })
      if (chosen !== undefined) {
        return { route: chosen, chain: fallbackOrder(role, chosen), role: role.id, source: 'ai' }
      }
    }
    const head = role.chain[0]
    if (head === undefined) {
      /* v8 ignore next -- guarded by the empty-chain check above. */
      throw new Error(`role "${requestedRole}" has no members yet`)
    }
    return { route: head, chain: fallbackOrder(role, head), role: role.id, source: 'chain' }
  }

  /** Describe the members for the router call. */
  private candidates(settings: RoleConfigSettings, chain: readonly RouteMember[]): RouterCandidate[] {
    return chain.map((route) => {
      const entry = poolEntryOf(settings, route)
      return {
        route,
        label: entry?.label ?? '',
        description: entry?.description ?? '',
        declared: (entry?.capabilities ?? []).slice(),
      }
    })
  }
}
