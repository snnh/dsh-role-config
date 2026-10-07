/**
 * The precondition of the shadow delegation tool.
 *
 * This plugin registers a tool under the official `subagent` name. That only
 * works while the official tool lives in an outer scope: with
 * `modelSelectionSettings: true` the official plugin installs its tool into
 * each agent's own scope, where a second registration of the same name
 * throws, and neither text shadowing nor `tools.restrict()` can hide it.
 *
 * The check below reads the Loader's own rows - including rows nested inside
 * an agent preset - so the operator gets one sentence naming the row and the
 * field instead of a duplicate-registration stack trace.
 *
 * @module dsh-role-config/official-tool
 */
import type { Context } from '@deepseek-ai/cordis';
/** The official delegation tool package. */
export declare const OFFICIAL_TOOL_PACKAGE = "@deepseek-ai/dsh-tool-subagent";
/** Env var name a deployment may use; kept for diagnostics wording. */
export interface OfficialCollision {
    /** Loader entry id of the offending row, as the operator sees it in a patch. */
    readonly rowId: string;
    /** Module name the row mounts. */
    readonly moduleName: string;
}
/**
 * Find every official row that would collide with this plugin's tool.
 * @param ctx - the plugin's Host context (the Loader is read when present).
 * @param toolName - the name this plugin registers.
 * @returns offending rows, outermost first; empty when nothing collides.
 */
export declare function findOfficialModelSelectionRows(ctx: Context, toolName: string): OfficialCollision[];
/**
 * The one sentence an operator needs, naming the fix.
 * @param collisions - offending rows found by {@link findOfficialModelSelectionRows}.
 * @param toolName - the name this plugin registers.
 * @returns the message to log.
 */
export declare function collisionAdvice(collisions: readonly OfficialCollision[], toolName: string): string;
//# sourceMappingURL=official-tool.d.ts.map