/**
 * Pure role routing: which member of a role serves a delegation, and in what
 * order the others follow when it fails.
 *
 * Nothing here talks to the harness. The Host resolves live capability facts
 * and passes them in, so every decision is a plain function a test can pin:
 * conditions first (the user's rules), otherwise the role's priority chain.
 * Selecting a member with AI routing happens in the Host, on top of these
 * primitives.
 *
 * @module dsh-role-config/routing
 */

import type {
  PoolModel,
  Role,
  RoleConfigSettings,
  RouteCondition,
  RouteMember,
  RouteRule,
} from './settings.ts'
import { routeKey } from './settings.ts'

/** Where one routing decision came from. */
export type RouteSource = 'rule' | 'chain' | 'ai'

/** One resolved decision: which model serves, and why. */
export interface RouteSelection {
  /** The selected pool member. */
  readonly member: RouteMember
  /** Whether a condition rule, the chain head, or the router model chose it. */
  readonly source: RouteSource
  /** The matched rule, when {@link RouteSelection.source} is `rule`. */
  readonly rule?: RouteRule
}

/**
 * Capability facts for one route.
 *
 * `modalities` and `contextWindow` come from the live adapter catalog; a
 * missing value means the adapter disclosed nothing, never "no capability".
 * `tags` are the user's own declarations from the pool entry, consulted only
 * where the adapter stayed silent.
 */
export interface RouteFacts {
  /** Declared input modalities, or undefined when the adapter disclosed none. */
  readonly modalities: ReadonlySet<string> | undefined
  /** Declared context window in tokens, or undefined when unknown. */
  readonly contextWindow: number | undefined
  /** User-declared capability tags for this route. */
  readonly tags: ReadonlySet<string>
}

/** Look up the facts of one route. */
export type FactsLookup = (route: RouteMember) => RouteFacts

/** Facts for a route nobody knows anything about. */
export const EMPTY_FACTS: RouteFacts = {
  modalities: undefined,
  contextWindow: undefined,
  tags: new Set<string>(),
}

/**
 * Index roles by id. A duplicate id keeps its first occurrence; the settings
 * validation reports the duplicate to the editor.
 * @param settings - current settings snapshot.
 * @returns role id to its role.
 */
export function indexRoles(settings: RoleConfigSettings): Map<string, Role> {
  const index = new Map<string, Role>()
  for (const role of settings.roles) {
    if (!index.has(role.id)) index.set(role.id, role)
  }
  return index
}

/**
 * Index pool entries by route key.
 * @param settings - current settings snapshot.
 * @returns route key to its pool entry.
 */
export function indexPool(settings: RoleConfigSettings): Map<string, PoolModel> {
  const index = new Map<string, PoolModel>()
  for (const entry of settings.pool) index.set(routeKey(entry), entry)
  return index
}

/**
 * Whether every stated condition holds for one delegation.
 * @param condition - the rule's condition block.
 * @param prompt - the delegation prompt the model supplied.
 * @param facts - capability facts of the member being tested.
 * @returns whether the condition is satisfied.
 */
export function conditionMatches(
  condition: RouteCondition,
  prompt: string,
  facts: RouteFacts,
): boolean {
  const haystack = prompt.toLowerCase()
  const promptAny = condition.promptAny ?? []
  if (promptAny.length > 0 && !promptAny.some(needle => needle.length > 0 && haystack.includes(needle.toLowerCase()))) {
    return false
  }
  const regex = condition.promptRegex
  if (regex !== undefined && regex.length > 0 && !new RegExp(regex).test(prompt)) return false

  const modalities = condition.modalities ?? []
  if (modalities.length > 0) {
    // An undeclared modality vocabulary is "unknown", not "absent": the rule
    // is skipped rather than silently routed to a model that cannot serve it.
    if (facts.modalities === undefined) return false
    if (!modalities.every(modality => facts.modalities?.has(modality) === true)) return false
  }
  const minContextWindow = condition.minContextWindow ?? 0
  if (minContextWindow > 0) {
    if (facts.contextWindow === undefined || facts.contextWindow < minContextWindow) return false
  }
  const tags = condition.capabilities ?? []
  if (tags.length > 0 && !tags.every(tag => facts.tags.has(tag))) return false
  return true
}

/**
 * Evaluate the role's rules in order.
 * @param role - the role whose rules run.
 * @param prompt - the delegation prompt.
 * @param facts - facts lookup for candidate members.
 * @returns the first matching rule and its member, or undefined.
 */
export function selectByRules(
  role: Role,
  prompt: string,
  facts: FactsLookup,
): { rule: RouteRule; member: RouteMember } | undefined {
  for (const rule of role.rules ?? []) {
    if (!conditionMatches(rule.when, prompt, facts(rule.use))) continue
    return { rule, member: rule.use }
  }
  return undefined
}

/**
 * The chain head, which serves when no rule matched.
 * @param role - the role whose chain is read.
 * @returns the head member, or undefined for an empty chain.
 */
export function chainHead(role: Role): RouteMember | undefined {
  return role.chain[0]
}

/**
 * The order in which members serve after one is chosen: the chosen member
 * first, then the role's priority chain without it.
 * @param role - the role whose chain orders the fallback.
 * @param primary - the member already chosen (a rule's target or the head).
 * @returns every member in serving order, the primary first.
 */
export function fallbackOrder(role: Role, primary: RouteMember | undefined): RouteMember[] {
  if (primary === undefined) return [...role.chain]
  const primaryKey = routeKey(primary)
  const seen = new Set<string>([primaryKey])
  const order: RouteMember[] = [primary]
  for (const member of role.chain) {
    const key = routeKey(member)
    if (seen.has(key)) continue
    seen.add(key)
    order.push(member)
  }
  return order
}

/**
 * Members of a role that carry a capability the rule system can see, in chain
 * order. Used to describe a role to the router model without leaking the
 * chain to the main agent.
 * @param role - the role to describe.
 * @param facts - facts lookup.
 * @returns one entry per member with its facts.
 */
export function describeRole(
  role: Role,
  facts: FactsLookup,
): { member: RouteMember; facts: RouteFacts; description: string | undefined }[] {
  return role.chain.map(member => ({
    member,
    facts: facts(member),
    description: undefined,
  }))
}
