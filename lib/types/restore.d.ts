/**
 * Put the official delegation tool back.
 *
 * The routed tool registers under the official tool's name and shadows it,
 * which only works while the official row is still MOUNTED in an outer scope:
 * a profile or bundle layer that mounts `@deepseek-ai/dsh-tool-subagent` inside
 * an agent preset puts the official definition in the preset scope, and this
 * plugin's per-agent registration is the nearer one - nearest scope wins a
 * name, so the model sees the routed tool while the official one keeps serving
 * every agent this plugin never touches.
 *
 * An operator can lose that fallback by disabling the official row, which is a
 * tempting way to make room for the routed name and leaves a deployment with
 * NO delegation tool as soon as this plugin is switched off. This module is
 * the other half of the takeover switch: with the routed tool off, the marker
 * is removed from the composition again, so "stop the takeover" restores the
 * official tool rather than removing delegation.
 *
 * Only rows nested inside another row's config are rewritten. The top-level
 * `disabled` flag of a Loader row is not part of any row's config, so the
 * configuration editor cannot write it; such a row is left alone and the
 * operator's own patch keeps owning it.
 *
 * @module dsh-role-config/restore
 */
import type { Context } from '@deepseek-ai/cordis';
/**
 * The config-editor face this module needs (a subset of `ctx.configEditor`).
 */
export interface RestoreEditor {
    /**
     * The rows this editor will accept an edit for: profile-level rows, unique by
     * id. Absent on an older harness, when the composition cannot be rewritten.
     */
    entries?(): readonly unknown[];
    /**
     * Validate, persist, and reconcile one row's next config.
     * @param entry - the Loader entry to edit.
     * @param change - derive the next raw config from the current and inherited ones.
     */
    edit(entry: never, change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>): Promise<void>;
}
/**
 * Plan the rewrite of one editable row's config, freeing the official tool.
 * @param config - the row's current config, of any shape.
 * @param toolName - the name this plugin took over.
 * @returns the next config plus the row ids it frees, or undefined when this
 * row carries no marker.
 */
export declare function planOfficialToolRestore(config: unknown, toolName: string): {
    next: unknown;
    rows: readonly string[];
} | undefined;
/**
 * Re-enable every official delegation row this composition disabled.
 *
 * Each edit goes through the configuration editor, which holds the profile
 * patch's writer lock, validates the row's config against its plugin schema -
 * the preset's own schema keeps child rows literal, so their `!!js` conditions
 * survive the round trip - and reconciles the Loader. Agents already composed
 * keep the preset revision they were built from; the official tool returns for
 * the sessions that follow.
 *
 * @param options.ctx - the plugin's Host context (the editor is read from it).
 * @param options.toolName - the name this plugin took over.
 * @param options.warn - operator-facing diagnostic sink.
 * @returns the ids of the rows re-enabled, in the order they were found.
 */
export declare function restoreOfficialTool(options: {
    ctx: Context;
    toolName: string;
    warn: (message: string, ...args: unknown[]) => void;
}): Promise<readonly string[]>;
//# sourceMappingURL=restore.d.ts.map