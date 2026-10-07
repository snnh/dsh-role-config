/**
 * The optional AI routing stage.
 *
 * A role's condition rules are exact and free. When none of them matches and
 * the operator turned AI routing on, one small model call decides between the
 * role's members instead of the static chain head, reading the delegation
 * prompt and each member's own description.
 *
 * The call is auxiliary: it belongs to no session, its failure is never fatal
 * (the chain head serves instead), and it is bounded by its own deadline
 * fused with the caller's cancellation.
 *
 * @module dsh-role-config/router
 */
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { RouteMember, Routing } from './settings.ts';
/** Minimal logger face; the whole plugin logs through this. */
export interface RouterLogger {
    /** Log one best-effort diagnostic. */
    warn(message: string, ...args: unknown[]): void;
}
/** One member offered to the router model. */
export interface RouterCandidate {
    /** The route the router may answer with. */
    readonly route: RouteMember;
    /** Display name, when the operator set one. */
    readonly label: string;
    /** The operator's description of what this model is good at. */
    readonly description: string;
    /** Facts worth telling the router (declared modalities, context window). */
    readonly declared: string[];
}
/**
 * Ask the router model which member should serve one delegation.
 *
 * @param options.llm - the LLM service; absent means the stage cannot run.
 * @param options.logger - diagnostic sink.
 * @param options.routing - the live routing settings (router route, deadline).
 * @param options.roleId - role being routed, for the prompt.
 * @param options.prompt - the delegation prompt the model supplied.
 * @param options.candidates - members the router may choose from.
 * @param options.signal - caller cancellation.
 * @returns the chosen member, or undefined when the stage is unavailable,
 * fails, times out, or answers nothing usable.
 */
export declare function askRouter(options: {
    llm: LlmRuntime | undefined;
    logger: RouterLogger;
    routing: Routing;
    roleId: string;
    prompt: string;
    candidates: readonly RouterCandidate[];
    signal: AbortSignal;
}): Promise<RouteMember | undefined>;
//# sourceMappingURL=router.d.ts.map