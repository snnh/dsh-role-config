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
 * an agent preset, which reach the Loader as children of a `cordis:group` row
 * whose config is the child array - so the operator gets one sentence naming
 * the row and the field instead of a duplicate-registration stack trace.
 *
 * @module dsh-role-config/official-tool
 */
/** The official delegation tool package. */
export const OFFICIAL_TOOL_PACKAGE = '@deepseek-ai/dsh-tool-subagent';
/** Whether a row is the official delegation tool with model selection on. */
function collides(row, toolName) {
    if (row.name !== OFFICIAL_TOOL_PACKAGE)
        return false;
    const config = (typeof row.config === 'object' && row.config !== null ? row.config : {});
    const rowToolName = typeof config.toolName === 'string' ? config.toolName : 'subagent';
    return rowToolName === toolName && config.modelSelectionSettings === true;
}
/**
 * Child rows one row's config carries, in either shape a composition uses: a
 * `cordis:group` (or preset) row holds its children as the config array
 * itself, while a wrapper states them under `plugins`. Walking only one of
 * these shapes misses the official tool inside a group, and a missed row is
 * not a cosmetic problem: this plugin would register its own `subagent`, and
 * the official registration that follows in the same scope fails the session.
 * @param config - the row's config, of any shape.
 * @returns the child rows to visit, or undefined when the config holds none.
 */
function nestedRows(config) {
    if (Array.isArray(config))
        return config;
    if (typeof config === 'object' && config !== null && Array.isArray(config.plugins)) {
        return config.plugins;
    }
    return undefined;
}
/**
 * Find every official row that would collide with this plugin's tool.
 * @param ctx - the plugin's Host context (the Loader is read when present).
 * @param toolName - the name this plugin registers.
 * @returns offending rows, outermost first; empty when nothing collides.
 */
export function findOfficialModelSelectionRows(ctx, toolName) {
    const loader = ctx.get('loader');
    if (loader === undefined)
        return [];
    const found = [];
    const visit = (rows) => {
        for (const candidate of rows) {
            if (typeof candidate !== 'object' || candidate === null)
                continue;
            const row = candidate;
            if (collides(row, toolName)) {
                found.push({
                    rowId: typeof row.id === 'string' ? row.id : '(unnamed row)',
                    moduleName: OFFICIAL_TOOL_PACKAGE,
                });
            }
            const children = nestedRows(row.config);
            if (children !== undefined)
                visit(children);
        }
    };
    const entries = loader.entries;
    if (typeof entries !== 'function')
        return [];
    const rows = entries.call(loader);
    if (!Array.isArray(rows))
        return [];
    visit(rows.map((entry) => {
        const options = entry.options;
        return options === undefined ? {} : options;
    }));
    return found;
}
/**
 * The one sentence an operator needs, naming the fix.
 * @param collisions - offending rows found by {@link findOfficialModelSelectionRows}.
 * @param toolName - the name this plugin registers.
 * @returns the message to log.
 */
export function collisionAdvice(collisions, toolName) {
    const rows = collisions.map(collision => `"${collision.rowId}"`).join(', ');
    return `the official delegation tool would collide with this plugin's "${toolName}" tool: row(s) ${rows} `
        + 'set modelSelectionSettings: true, which registers the official tool inside every agent scope where a '
        + 'same-named tool cannot be shadowed. Set modelSelectionSettings: false on those rows (the Subagent '
        + 'settings page then belongs to this plugin), or point delegate.toolName at another name.';
}
//# sourceMappingURL=official-tool.js.map