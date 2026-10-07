/**
 * Role presets and the model pool: the settings vocabulary, the plugin's
 * Config schema, and cross-field validation.
 *
 * Two user-authored parts live here. The **model pool** lists models the main
 * agent may name directly, each with the description the user wrote for it.
 * The **role presets** name roles (tiers the user extends freely) and decide,
 * per role, which model serves a request: user-written conditions first, then
 * the role's priority chain.
 *
 * A role never exposes its members to the model. Only the role's name and
 * description reach the model; the chain and its rules stay Host-side.
 *
 * @module dsh-role-config/settings
 */

import z from '@deepseek-ai/schemastery'

/** One exact provider/model route. */
export interface RouteMember {
  /** Registered LLM provider route. */
  readonly provider: string
  /** Provider-owned exact model id. */
  readonly model: string
}

/** One model the user admitted to the pool, with the user's own description. */
export interface PoolModel extends RouteMember {
  /** Optional display name; the settings page falls back to the model id. */
  readonly label?: string
  /**
   * What this model is good at, in the user's words. This is the text the main
   * agent reads when choosing a model directly.
   */
  readonly description: string
  /**
   * Capability tags the user declares by hand (`vision`, `long-context`, ...).
   * Rules fall back to these only where the live adapter discloses nothing.
   */
  readonly capabilities?: readonly string[]
}

/**
 * Conditions a routing rule tests. Every listed condition must hold; an
 * omitted or empty one is not a condition at all.
 */
export interface RouteCondition {
  /** The delegation prompt contains any of these substrings (case-insensitive). */
  readonly promptAny?: readonly string[]
  /** The delegation prompt matches this regular expression. */
  readonly promptRegex?: string
  /** The member must declare every one of these input modalities (`image`, ...). */
  readonly modalities?: readonly string[]
  /** The member's declared context window must be at least this many tokens. */
  readonly minContextWindow?: number
  /** The member must declare every one of these capability tags. */
  readonly capabilities?: readonly string[]
}

/** One user-written routing rule inside a role. */
export interface RouteRule {
  /** Optional label shown in the settings page. */
  readonly label?: string
  /** What must hold for this rule to select {@link RouteRule.use}. */
  readonly when: RouteCondition
  /** The role member this rule selects. */
  readonly use: RouteMember
}

/**
 * One role preset: a name and description the model sees, the priority chain
 * used by default and for fallback, and the conditions that pick another
 * member first.
 */
export interface Role {
  /** Stable id referenced by bindings and by the model's `role` argument. */
  readonly id: string
  /** Display name shown to the user and (with the description) to the model. */
  readonly label: string
  /** What this role is for; the model reads this to choose a role. */
  readonly description?: string
  /** Members in priority order: the head serves first, failure walks down. */
  readonly chain: readonly RouteMember[]
  /** Condition rules evaluated before the chain head, in order. */
  readonly rules?: readonly RouteRule[]
}

/** One function a role may serve, or `off` for the harness default. */
export interface BindingTarget {
  /** Whether the function keeps its harness default or follows a role. */
  readonly kind: 'off' | 'role'
  /** The role id when {@link BindingTarget.kind} is `role`. */
  readonly role?: string
}

/** Per-function role bindings. */
export interface Bindings {
  /** Context compaction's summarization route. */
  readonly compact: BindingTarget
  /** Session-title generation's route. */
  readonly sessionTitle: BindingTarget
  /** Role used when a delegation names neither a role nor a model. */
  readonly delegateDefault: BindingTarget
}

/** What the model may see, and how. */
export interface Exposure {
  /** Register the on-demand role/pool listing tool. */
  readonly listTool: boolean
  /** Insert the role and model descriptions at the start of each session. */
  readonly sessionStart: boolean
  /** Register the role-routing delegation tool. */
  readonly delegateTool: boolean
}

/** Routing behaviour shared by every role. */
export interface Routing {
  /** Walk the role chain after a terminal request failure. */
  readonly fallback: boolean
  /** Ask a router model when no condition rule matched. */
  readonly aiEnabled: boolean
  /** Router model provider route. */
  readonly aiProvider?: string
  /** Router model id. */
  readonly aiModel?: string
  /** Deadline for one router decision in milliseconds. */
  readonly aiTimeoutMs: number
}

/** Delegation settings of the routing tool. */
export interface DelegateConfig {
  /** Registered subagent provider the tool starts runs on (e.g. `spawn`). */
  readonly provider: string
  /** Model-facing tool name; must match the official tool it shadows. */
  readonly toolName: string
  /** Expose `run_in_background`. */
  readonly enableRunInBackground: boolean
}

/** The complete settings section this plugin owns. */
export interface RoleConfigSettings {
  /** Models the main agent may name directly, with the user's descriptions. */
  readonly pool: readonly PoolModel[]
  /** Role presets, listed in the order the operator arranged them. */
  readonly roles: readonly Role[]
  /** Per-function role bindings. */
  readonly bindings: Bindings
  /** Model-visible surfaces. */
  readonly exposure: Exposure
  /** Routing behaviour. */
  readonly routing: Routing
  /** Delegation tool wiring. */
  readonly delegate: DelegateConfig
}

const routeMember = z.object({
  provider: z.string().required(),
  model: z.string().required(),
})

const bindingTarget = z.object({
  kind: z.union(['off', 'role'] as const).default('off'),
  role: z.string(),
})

/**
 * Plugin configuration. Every field is volatile so the Plugins page edits the
 * live section, and every field carries a default so a deployment that states
 * nothing still boots with the feature off.
 */
export const Config = z.object({
  pool: z.array(z.object({
    provider: z.string().required(),
    model: z.string().required(),
    label: z.string(),
    description: z.string().default(''),
    capabilities: z.array(z.string()).default([]),
  })).default([]).volatile(),
  roles: z.array(z.object({
    id: z.string().required(),
    label: z.string().required(),
    description: z.string(),
    chain: z.array(routeMember).default([]),
    rules: z.array(z.object({
      label: z.string(),
      when: z.object({
        promptAny: z.array(z.string()).default([]),
        promptRegex: z.string(),
        modalities: z.array(z.string()).default([]),
        minContextWindow: z.number().default(0),
        capabilities: z.array(z.string()).default([]),
      }).default({}),
      // `use` stays optional in the schema so a half-written row never
      // bricks the Host; inspectRoleConfig() reports it to the editor.
      use: routeMember.default({ provider: '', model: '' }),
    })).default([]),
  })).default([]).volatile(),
  bindings: z.object({
    compact: bindingTarget.default({ kind: 'off' }),
    sessionTitle: bindingTarget.default({ kind: 'off' }),
    delegateDefault: bindingTarget.default({ kind: 'off' }),
  }).default({}).volatile(),
  exposure: z.object({
    listTool: z.boolean().default(true),
    sessionStart: z.boolean().default(false),
    delegateTool: z.boolean().default(true),
  }).default({}).volatile(),
  routing: z.object({
    fallback: z.boolean().default(true),
    aiEnabled: z.boolean().default(false),
    aiProvider: z.string(),
    aiModel: z.string(),
    aiTimeoutMs: z.number().default(8000),
  }).default({}).volatile(),
  delegate: z.object({
    provider: z.string().default('spawn'),
    toolName: z.string().default('subagent'),
    enableRunInBackground: z.boolean().default(true),
  }).default({}).volatile(),
})

/** Stable identity for one exact route. */
export function routeKey(route: RouteMember): string {
  return `${route.provider}\u0000${route.model}`
}

/** Human-readable `provider/model` for diagnostics and descriptions. */
export function routeLabel(route: RouteMember): string {
  return `${route.provider}/${route.model}`
}

/** One validation failure, addressed to a settings path the editor can show. */
export interface RoleConfigProblem {
  /** Dotted path into the settings document. */
  readonly path: string
  /** What is wrong, in one sentence. */
  readonly message: string
}

/** Whether a condition lists nothing at all. */
export function conditionIsEmpty(condition: RouteCondition): boolean {
  return (condition.promptAny ?? []).length === 0
    && (condition.promptRegex ?? '').length === 0
    && (condition.modalities ?? []).length === 0
    && (condition.minContextWindow ?? 0) <= 0
    && (condition.capabilities ?? []).length === 0
}

/**
 * Check the cross-field rules the Config schema cannot express.
 *
 * Findings are returned rather than thrown so the Host can serve a partially
 * configured section (the routing then reports what is wrong) while the
 * editor blocks a save that would introduce them.
 *
 * @param settings - the settings snapshot to inspect.
 * @returns every problem found, in document order.
 */
export function inspectRoleConfig(settings: RoleConfigSettings): RoleConfigProblem[] {
  const problems: RoleConfigProblem[] = []
  const poolKeys = new Map<string, string>()
  settings.pool.forEach((entry, index) => {
    const path = `pool.${index}`
    if (entry.provider.trim().length === 0 || entry.model.trim().length === 0) {
      problems.push({ path, message: 'a pool entry needs both a provider and a model' })
      return
    }
    const key = routeKey(entry)
    const previous = poolKeys.get(key)
    if (previous !== undefined) {
      problems.push({ path, message: `duplicate pool entry for ${routeLabel(entry)} (also at ${previous})` })
      return
    }
    poolKeys.set(key, path)
  })

  const roleIds = new Map<string, string>()
  settings.roles.forEach((role, roleIndex) => {
    const rolePath = `roles.${roleIndex}`
    if (role.id.trim().length === 0) {
      problems.push({ path: `${rolePath}.id`, message: 'a role needs an id' })
    } else {
      const previous = roleIds.get(role.id)
      if (previous !== undefined) {
        problems.push({ path: `${rolePath}.id`, message: `duplicate role id "${role.id}" (also at ${previous})` })
      } else {
        roleIds.set(role.id, `${rolePath}.id`)
      }
    }
    const inChain = new Set<string>()
    role.chain.forEach((member, memberIndex) => {
      const key = routeKey(member)
      if (!poolKeys.has(key)) {
        problems.push({
          path: `${rolePath}.chain.${memberIndex}`,
          message: `${routeLabel(member)} is not in the model pool`,
        })
      }
      if (inChain.has(key)) {
        problems.push({
          path: `${rolePath}.chain.${memberIndex}`,
          message: `${routeLabel(member)} appears twice in this role`,
        })
      }
      inChain.add(key)
    })
    for (const [ruleIndex, rule] of (role.rules ?? []).entries()) {
      const rulePath = `${rolePath}.rules.${ruleIndex}`
      if (!inChain.has(routeKey(rule.use))) {
        problems.push({
          path: `${rulePath}.use`,
          message: `${routeLabel(rule.use)} is not a member of role "${role.id}"`,
        })
      }
      const regex = rule.when.promptRegex
      if (regex !== undefined && regex.length > 0) {
        try {
          void new RegExp(regex)
        } catch (error: unknown) {
          problems.push({
            path: `${rulePath}.when.promptRegex`,
            message: `invalid regular expression: ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      }
      if (conditionIsEmpty(rule.when)) {
        problems.push({ path: `${rulePath}.when`, message: 'a rule needs at least one condition' })
      }
    }
  })

  // A partially written document reaches this check through the Host's own
  // resolution; a missing binding must be reported, never crash the read.
  const configuredBindings = settings.bindings ?? {}
  const bindings: readonly [BindingTarget | undefined, string][] = [
    [configuredBindings.compact, 'bindings.compact'],
    [configuredBindings.sessionTitle, 'bindings.sessionTitle'],
    [configuredBindings.delegateDefault, 'bindings.delegateDefault'],
  ]
  for (const [binding, path] of bindings) {
    if (binding?.kind !== 'role') continue
    const role = binding.role ?? ''
    if (role.length === 0) {
      problems.push({ path: `${path}.role`, message: 'choose a role or turn this binding off' })
    } else if (!roleIds.has(role)) {
      problems.push({ path: `${path}.role`, message: `role "${role}" does not exist` })
    }
  }

  if ((settings.routing ?? {}).aiEnabled === true) {
    const provider = settings.routing?.aiProvider ?? ''
    const model = settings.routing?.aiModel ?? ''
    if (provider.length === 0 || model.length === 0) {
      problems.push({
        path: 'routing.aiProvider',
        message: 'AI routing needs a router model (provider and model together)',
      })
    }
    const timeout = settings.routing?.aiTimeoutMs ?? 0
    if (!Number.isFinite(timeout) || timeout <= 0) {
      problems.push({ path: 'routing.aiTimeoutMs', message: 'the router deadline must be a positive number' })
    }
  }

  if ((settings.delegate?.provider ?? '').trim().length === 0) {
    problems.push({ path: 'delegate.provider', message: 'the delegation tool needs a subagent provider name' })
  }
  if ((settings.delegate?.toolName ?? '').trim().length === 0) {
    problems.push({ path: 'delegate.toolName', message: 'the delegation tool needs a tool name' })
  }
  return problems
}

/**
 * Reject a settings document that may not serve traffic.
 *
 * @param settings - candidate settings.
 * @throws Error naming every problem found, for Host-side load diagnostics.
 */
export function assertRoleConfig(settings: RoleConfigSettings): void {
  const problems = inspectRoleConfig(settings)
  if (problems.length > 0) {
    throw new Error(`role-config: ${problems.map(problem => `${problem.path}: ${problem.message}`).join('; ')}`)
  }
}
