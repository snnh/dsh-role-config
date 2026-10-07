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
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { FactsLookup } from './routing.ts';
import type { PoolModel, RoleConfigSettings, RouteMember } from './settings.ts';
/**
 * Resolve and cache capability facts for the routes a settings snapshot names.
 *
 * The Host calls {@link prepare} once per routing decision (it is cheap once
 * warm: cache hits never touch the adapter), then routes with the returned
 * synchronous lookup, keeping the rule engine pure.
 */
export declare class CapabilityDirectory {
    private readonly llm;
    private readonly cache;
    private generation;
    /**
     * @param llm - the LLM service whose adapter catalog answers capability
     * questions; absent while no adapter plugin is mounted.
     */
    constructor(llm: LlmRuntime | undefined);
    /** Drop every cached fact; the next prepare re-reads the live catalog. */
    invalidate(): void;
    /**
     * Resolve facts for every route the settings snapshot may ask about.
     * @param settings - current settings snapshot.
     * @param signal - caller cancellation.
     * @returns a synchronous lookup over every pool route.
     */
    prepare(settings: RoleConfigSettings, signal?: AbortSignal): Promise<FactsLookup>;
    /**
     * Whether an adapter answered for this route during the current generation.
     * @param route - the route to inspect.
     * @returns whether the route is currently servable.
     */
    available(route: RouteMember): boolean;
    /** Read one route's cached facts, or the unknown answer when unloaded. */
    private read;
    /** Load one route's facts unless a fresh cache entry already covers it. */
    private load;
}
/**
 * The pool entry for one route, when the settings still hold it.
 * @param settings - current settings snapshot.
 * @param route - route to look up.
 * @returns the matching pool entry, or undefined.
 */
export declare function poolEntryOf(settings: RoleConfigSettings, route: RouteMember): PoolModel | undefined;
//# sourceMappingURL=capabilities.d.ts.map