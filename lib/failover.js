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
import { routeLabel } from "./settings.js";
/** Track which delegated children may fail over, and how far they have moved. */
export class FailoverRegistry {
    logger;
    enabled;
    states = new WeakMap();
    /**
     * @param logger - diagnostic sink.
     * @param enabled - whether the operator kept priority failover on.
     */
    constructor(logger, enabled) {
        this.logger = logger;
        this.enabled = enabled;
    }
    /**
     * Remember one child's chain, so its failures can walk it.
     * @param agent - the child agent the run published.
     * @param role - role that produced the plan.
     * @param chain - members in serving order.
     */
    track(agent, role, chain) {
        if (chain.length < 2)
            return;
        this.states.set(agent, { role, chain, index: 0 });
    }
    /** Drop one child's state (it settled, or its chain was exhausted). */
    forget(agent) {
        this.states.delete(agent);
    }
    /** Whether this plugin started the agent through a role. */
    tracks(agent) {
        return this.states.has(agent);
    }
    /**
     * The replacement config for one request, when a failover advanced the chain.
     * @param agent - the agent about to issue a request.
     * @param config - the config the loop would otherwise use.
     * @returns the config to use instead.
     */
    applyPending(agent, config) {
        const state = this.states.get(agent);
        const target = state?.pending;
        if (state === undefined || target === undefined)
            return config;
        state.pending = undefined;
        const { reasoningEffort: _dropped, ...rest } = config;
        return { ...rest, provider: target.provider, model: target.model };
    }
    /**
     * Advance one child's chain after a terminal request failure.
     * @param agent - the failed agent.
     * @returns whether a retry on the next member was scheduled.
     */
    advance(agent) {
        const state = this.states.get(agent);
        if (state === undefined || !this.enabled())
            return false;
        const previous = state.chain[state.index];
        const next = state.chain[state.index + 1];
        if (next === undefined) {
            this.forget(agent);
            this.logger.warn('role "%s" exhausted its chain at %s; the failure stands', state.role, previous === undefined ? '(unknown)' : routeLabel(previous));
            return false;
        }
        state.index += 1;
        state.pending = next;
        this.logger.warn('role "%s" failed on %s; retrying the same request on %s', state.role, previous === undefined ? '(unknown)' : routeLabel(previous), routeLabel(next));
        return true;
    }
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
export function installFailover(ctx, registry) {
    ctx.on('agent/request-error', async (payload, next) => {
        const downstream = await next();
        if (downstream !== undefined)
            return downstream;
        return registry.advance(payload.agent) ? { kind: 'retry' } : undefined;
    });
    ctx.on('agent/request', async (payload, next) => {
        const config = await next();
        return registry.applyPending(payload.agent, config);
    });
}
//# sourceMappingURL=failover.js.map