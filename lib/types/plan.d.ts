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
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { CapabilityDirectory } from './capabilities.ts';
import type { RouterLogger } from './router.ts';
import type { RoleConfigSettings, RouteMember } from './settings.ts';
/** What the model asked the delegation tool for. */
export interface DelegationRequest {
    /** The task text, passed through to the child. */
    readonly prompt: string;
    /** Role id the operator configured, when the model chose a role. */
    readonly role?: string;
    /** Provider route the model named directly. */
    readonly provider?: string;
    /** Model id the model named directly. */
    readonly model?: string;
}
/** How a plan was reached. */
export type PlanSource = 'rule' | 'chain' | 'ai' | 'direct' | 'inherit' | 'default';
/** One resolved delegation. */
export interface DelegationPlan {
    /** Which route serves first, or undefined when the child inherits. */
    readonly route?: RouteMember;
    /** Routes in serving order: the primary first, then the rest of the chain. */
    readonly chain: readonly RouteMember[];
    /** The role that produced this plan, when one did. */
    readonly role?: string;
    /** How the primary was chosen. */
    readonly source: PlanSource;
}
/**
 * Resolve delegation requests against the live settings.
 *
 * Rules and capabilities are read per request: a settings write or a newly
 * configured adapter must be visible on the very next delegation.
 */
export declare class DelegationPlanner {
    private readonly settings;
    private readonly capabilities;
    private readonly llm;
    private readonly logger;
    /**
     * @param settings - current settings snapshot reader.
     * @param capabilities - live capability facts for pool routes.
     * @param llm - the LLM service, for the optional router call.
     * @param logger - diagnostic sink.
     */
    constructor(settings: () => RoleConfigSettings, capabilities: CapabilityDirectory, llm: LlmRuntime | undefined, logger: RouterLogger);
    /**
     * Resolve one request.
     * @param request - the model's arguments.
     * @param signal - caller cancellation.
     * @returns the serving route and its fallback order.
     * @throws Error with an actionable message for an unusable request.
     */
    plan(request: DelegationRequest, signal: AbortSignal): Promise<DelegationPlan>;
    /** Describe the members for the router call. */
    private candidates;
}
//# sourceMappingURL=plan.d.ts.map