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
import { OFFICIAL_TOOL_PACKAGE } from "./official-tool.js";
/**
 * The model-facing name one official row mounts, or undefined for any other row.
 * @param row - a candidate row of any config shape.
 * @returns the tool name, or undefined when this row is not the official tool.
 */
function officialToolName(row) {
    if (row.name !== OFFICIAL_TOOL_PACKAGE)
        return undefined;
    const config = (typeof row.config === 'object' && row.config !== null ? row.config : {});
    return typeof config.toolName === 'string' ? config.toolName : 'subagent';
}
/**
 * Rebuild one config value with the takeover marker removed.
 *
 * A row qualifies when it mounts the official tool under the taken-over name
 * AND is disabled by a literal `true`: the exact shape the takeover leaves
 * behind. An expression-valued `disabled` (`!!js ...`) belongs to the
 * composition's own conditions and stays untouched, as does every other row.
 * @param value - any config value: a row list, a row, or plain data.
 * @param toolName - the name this plugin took over.
 * @param freed - collects the ids of the rows re-enabled by this rebuild.
 * @returns the rebuilt value; unchanged data keeps its identity.
 */
function stripMarker(value, toolName, freed) {
    if (Array.isArray(value)) {
        let changed = false;
        const rows = value.map((item) => {
            const next = stripMarker(item, toolName, freed);
            if (next !== item)
                changed = true;
            return next;
        });
        return changed ? rows : value;
    }
    if (typeof value !== 'object' || value === null)
        return value;
    const row = value;
    const stripped = officialToolName(row) === toolName && row.disabled === true;
    const rest = { ...row };
    if (stripped)
        delete rest.disabled;
    let changed = stripped;
    for (const [key, child] of Object.entries(rest)) {
        const next = stripMarker(child, toolName, freed);
        if (next !== child) {
            rest[key] = next;
            changed = true;
        }
    }
    if (!stripped)
        return changed ? rest : value;
    freed.push(typeof row.id === 'string' ? row.id : toolName);
    return rest;
}
/**
 * Plan the rewrite of one editable row's config, freeing the official tool.
 * @param config - the row's current config, of any shape.
 * @param toolName - the name this plugin took over.
 * @returns the next config plus the row ids it frees, or undefined when this
 * row carries no marker.
 */
export function planOfficialToolRestore(config, toolName) {
    const freed = [];
    const next = stripMarker(config, toolName, freed);
    return freed.length === 0 ? undefined : { next, rows: freed };
}
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
export async function restoreOfficialTool(options) {
    const { ctx, toolName, warn } = options;
    const editor = ctx.get('configEditor');
    if (editor === undefined)
        return [];
    const freed = [];
    for (const entry of editor.entries?.() ?? []) {
        const manifest = entry;
        const plan = planOfficialToolRestore(manifest.options?.config, toolName);
        if (plan === undefined)
            continue;
        try {
            await editor.edit(entry, () => plan.next);
            freed.push(...plan.rows);
        }
        catch (error) {
            warn('could not re-enable the official delegation tool on row "%s": %s', typeof manifest.options?.id === 'string' ? manifest.options.id : '(unnamed row)', error instanceof Error ? error.message : String(error));
        }
    }
    return freed;
}
//# sourceMappingURL=restore.js.map