/**
 * The delegation tool: the model's only way to start a subagent here.
 *
 * It is registered under the official tool's own name and replaces it for
 * every agent (see `official-tool.ts` for the precondition). Its parameter
 * surface mirrors the official tool — `description`, `prompt`, and
 * `run_in_background` — and adds the two ways this plugin decides a route:
 * `role` (the operator's rules pick the model) and `provider` + `model` (the
 * model names a pool member directly).
 *
 * Everything else is the official behaviour: one child published through
 * `ctx.subagents`, one-shot background through `ctx.jobs`, and the child's
 * final output returned to the caller.
 *
 * @module dsh-role-config/tools/delegate
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FailoverRegistry } from '../failover.ts';
import type { DelegationPlanner } from '../plan.ts';
import type { RoleConfigSettings } from '../settings.ts';
/** Services the delegation tool reads at call time. */
export interface DelegateDeps {
    /** Current settings snapshot reader. */
    settings(): RoleConfigSettings;
    /** Request resolver: roles, rules, the optional router, direct routes. */
    planner: DelegationPlanner;
    /** Children this plugin started through a role, for priority failover. */
    failover: FailoverRegistry;
    /** Operator-facing diagnostics, also mirrored to the console. */
    warn(message: string): void;
}
/**
 * Register the delegation tool on one scope.
 * @param ctx - the tool-hosting context (an agent scope).
 * @param deps - settings, planner, failover registry, diagnostics.
 * @returns the registration disposer.
 */
export declare function registerDelegateTool(ctx: Context, deps: DelegateDeps): () => void;
//# sourceMappingURL=delegate.d.ts.map