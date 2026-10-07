/**
 * Live capability facts for pool routes.
 *
 * A routing rule such as "this role's multimodal member" needs to know which
 * members declare image input. The adapter catalog answers that where it can;
 * a route the adapter does not describe keeps `undefined` (unknown) rather
 * than a negative answer, and the user's own capability tags fill that gap.
 *
 * Facts are cached per Host generation and dropped when the adapter registry
 * announces `llm/adapters-updated`, so a newly configured provider is visible
 * without restarting the Host.
 *
 * @module dsh-role-config/capabilities
 */

import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { RouteFacts, FactsLookup } from './routing.ts'
import type { PoolModel, RoleConfigSettings, RouteMember } from './settings.ts'
import { routeKey } from './settings.ts'

/** Capability facts for one route nobody has loaded yet. */
function unknownFacts(tags: readonly string[]): RouteFacts {
  return { modalities: undefined, contextWindow: undefined, tags: new Set(tags) }
}

/** One cache entry: the facts and the generation that produced them. */
interface CacheEntry {
  readonly generation: number
  readonly facts: RouteFacts
}

/**
 * Resolve and cache capability facts for the routes a settings snapshot names.
 *
 * The Host calls {@link prepare} once per routing decision (it is cheap once
 * warm: cache hits never touch the adapter), then routes with the returned
 * synchronous lookup, keeping the rule engine pure.
 */
export class CapabilityDirectory {
  private readonly cache = new Map<string, CacheEntry>()
  private generation = 0

  /**
   * @param llm - the LLM service whose adapter catalog answers capability
   * questions; absent while no adapter plugin is mounted.
   */
  constructor(private readonly llm: LlmRuntime | undefined) {}

  /** Drop every cached fact; the next prepare re-reads the live catalog. */
  invalidate(): void {
    this.generation += 1
    this.cache.clear()
  }

  /**
   * Resolve facts for every route the settings snapshot may ask about.
   * @param settings - current settings snapshot.
   * @param signal - caller cancellation.
   * @returns a synchronous lookup over every pool route.
   */
  async prepare(settings: RoleConfigSettings, signal?: AbortSignal): Promise<FactsLookup> {
    const tags = new Map<string, readonly string[]>()
    for (const entry of settings.pool) tags.set(routeKey(entry), entry.capabilities ?? [])
    for (const key of tags.keys()) await this.load(key, signal)
    return route => this.read(route, tags.get(routeKey(route)) ?? [])
  }

  /** Read one route's cached facts, or the unknown answer when unloaded. */
  private read(route: RouteMember, tags: readonly string[]): RouteFacts {
    const cached = this.cache.get(routeKey(route))
    if (cached === undefined || cached.generation !== this.generation) return unknownFacts(tags)
    return { ...cached.facts, tags: new Set([...tags, ...cached.facts.tags]) }
  }

  /** Load one route's facts unless a fresh cache entry already covers it. */
  private async load(key: string, signal?: AbortSignal): Promise<void> {
    const cached = this.cache.get(key)
    if (cached !== undefined && cached.generation === this.generation) return
    const [provider = '', model = ''] = key.split('\u0000')
    if (this.llm === undefined || provider.length === 0 || model.length === 0) return
    if (!this.llm.listProviders().some(info => info.id === provider)) return
    if (signal?.aborted === true) return
    try {
      const info = await this.llm.resolveModelInfo(provider, model, signal)
      const modalities = info.inputModalities === undefined ? undefined : new Set(info.inputModalities)
      const contextWindow = info.context?.contextWindow
      this.cache.set(key, {
        generation: this.generation,
        facts: {
          modalities,
          contextWindow,
          tags: new Set<string>(),
        },
      })
    } catch {
      // An adapter that refuses one model leaves the route unknown; a rule
      // that needs a capability simply does not match it.
      this.cache.set(key, { generation: this.generation, facts: unknownFacts([]) })
    }
  }
}

/**
 * The pool entry for one route, when the settings still hold it.
 * @param settings - current settings snapshot.
 * @param route - route to look up.
 * @returns the matching pool entry, or undefined.
 */
export function poolEntryOf(settings: RoleConfigSettings, route: RouteMember): PoolModel | undefined {
  const key = routeKey(route)
  return settings.pool.find(entry => routeKey(entry) === key)
}
