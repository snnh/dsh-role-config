/**
 * Priority failover inside one role.
 *
 * A role's chain is the operator's order. When a delegated child exhausts its
 * provider's own retry policy, the next member of that chain serves the same
 * conversation instead of the failure standing: the child keeps its session,
 * its tools, and its task, and only the model behind the request changes.
 *
 * The engine is deliberately small and bounded. It tracks only children this
 * plugin started through a role, it only ever moves forward along the chain
 * (so a cycle cannot form), and it never swallows the final failure: when the
 * chain is exhausted the original error is what the parent sees.
 *
 * @module dsh-role-config/failover
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm';
import type { RouteMember } from './settings.ts';
/** Minimal logger face. */
export interface FailoverLogger {
    /** Log one best-effort diagnostic. */
    warn(message: string, ...args: unknown[]): void;
}
/** Track which delegated children may fail over, and how far they have moved. */
export declare class FailoverRegistry {
    private readonly logger;
    private readonly enabled;
    private readonly states;
    /**
     * @param logger - diagnostic sink.
     * @param enabled - whether the operator kept priority failover on.
     */
    constructor(logger: FailoverLogger, enabled: () => boolean);
    /**
     * Remember one child's chain, so its failures can walk it.
     * @param agent - the child agent the run published.
     * @param role - role that produced the plan.
     * @param chain - members in serving order.
     */
    track(agent: Agent, role: string, chain: readonly RouteMember[]): void;
    /** Drop one child's state (it settled, or its chain was exhausted). */
    forget(agent: Agent): void;
    /** Whether this plugin started the agent through a role. */
    tracks(agent: Agent): boolean;
    /**
     * The replacement config for one request, when a failover advanced the chain.
     * @param agent - the agent about to issue a request.
     * @param config - the config the loop would otherwise use.
     * @returns the config to use instead.
     */
    applyPending(agent: Agent, config: LlmCallConfig): LlmCallConfig;
    /**
     * Advance one child's chain after a terminal request failure.
     * @param agent - the failed agent.
     * @returns whether a retry on the next member was scheduled.
     */
    advance(agent: Agent): boolean;
}
/**
 * Install the failover listeners.
 *
 * The request-error listener runs after every downstream listener (the
 * provider's own retry policy included) and takes over only a failure nobody
 * else answered; the request listener swaps the route the loop is about to
 * use when the chain advanced.
 *
 * @param ctx - the plugin's Host context.
 * @param registry - the tracked children.
 * @returns nothing; registrations follow the plugin fiber's lifetime.
 */
export declare function installFailover(ctx: Context, registry: FailoverRegistry): void;
//# sourceMappingURL=failover.d.ts.map