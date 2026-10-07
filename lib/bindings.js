/**
 * Function bindings: a harness feature that generates with its own model can
 * follow one of the operator's roles instead of the session's route.
 *
 * The harness exposes no seam for this, so the binding writes the feature's
 * own configuration pair (for example `compaction-basic`'s
 * `summarizationProvider` / `summarizationModel`) and keeps it equal to the
 * role's first currently servable member. Turning a binding off clears the
 * pair, which restores the feature's own default: follow the session.
 *
 * @module dsh-role-config/bindings
 */
import { fallbackOrder, indexRoles } from "./routing.js";
import { routeLabel } from "./settings.js";
/** The features this plugin binds today. */
export const BINDABLE_FEATURES = [
    {
        key: 'compact',
        modules: ['@deepseek-ai/dsh-compaction-basic'],
        fields: ['summarizationProvider', 'summarizationModel'],
        label: 'context compaction',
    },
    {
        key: 'sessionTitle',
        modules: ['@deepseek-ai/dsh-session-title-first-prompt-llm', '@deepseek-ai/dsh-session-title-all-prompts-llm'],
        fields: ['provider', 'model'],
        label: 'session titles',
    },
];
/**
 * Find the live rows a binding may write.
 * @param ctx - the plugin's Host context (the Loader is read when present).
 * @param feature - the feature to look for.
 * @returns one row per live module, outermost first.
 */
export function findBindableRows(ctx, feature) {
    const loader = ctx.get('loader');
    if (loader === undefined)
        return [];
    const rows = [];
    for (const entry of loader.entries()) {
        const options = entry.options;
        if (options === undefined || typeof options.name !== 'string' || !feature.modules.includes(options.name))
            continue;
        rows.push({ entry, id: typeof options.id === 'string' ? options.id : options.name, feature });
    }
    return rows;
}
/**
 * Resolve the route a binding should write, preferring a member an adapter
 * currently serves.
 * @param settings - current settings snapshot.
 * @param capabilities - cached availability of pool routes.
 * @param target - the binding to resolve.
 * @returns the route to write, or undefined when the binding is off, the role
 * is missing or empty, or nothing can be written.
 */
export function resolveBindingRoute(settings, capabilities, target) {
    if (target.kind !== 'role')
        return undefined;
    const role = indexRoles(settings).get(target.role ?? '')?.role;
    if (role === undefined || role.chain.length === 0)
        return undefined;
    const order = fallbackOrder(role, role.chain[0]);
    return order.find(member => capabilities.available(member)) ?? role.chain[0];
}
/**
 * Bring every bindable row in line with the live settings.
 *
 * A row is written only when the pair it should carry differs from the pair it
 * holds, so a steady state costs no reconciliation. A row that is absent, a
 * missing editor, or a failing write is reported and skipped: the feature
 * keeps its own default rather than blocking anything else.
 *
 * @param options.ctx - the plugin's Host context.
 * @param options.settings - current settings snapshot.
 * @param options.capabilities - cached availability of pool routes.
 * @param options.warn - operator-facing diagnostic sink.
 */
export async function applyBindings(options) {
    const { ctx, settings, capabilities, warn } = options;
    const editor = ctx.get('configEditor');
    if (editor === undefined) {
        if (settings.bindings.compact.kind === 'role' || settings.bindings.sessionTitle.kind === 'role') {
            warn('function bindings need the config editor; the bound features keep their own default');
        }
        return;
    }
    for (const feature of BINDABLE_FEATURES) {
        const target = settings.bindings[feature.key];
        const route = resolveBindingRoute(settings, capabilities, target);
        for (const row of findBindableRows(ctx, feature)) {
            const [providerField, modelField] = feature.fields;
            const desiredProvider = route?.provider;
            const desiredModel = route?.model;
            try {
                await editor.edit(row.entry, (current) => {
                    const holds = current[providerField] === desiredProvider && current[modelField] === desiredModel;
                    if (holds)
                        return current;
                    const next = { ...current };
                    if (desiredProvider === undefined || desiredModel === undefined) {
                        delete next[providerField];
                        delete next[modelField];
                    }
                    else {
                        next[providerField] = desiredProvider;
                        next[modelField] = desiredModel;
                    }
                    return next;
                });
            }
            catch (error) {
                warn('could not bind %s on row "%s": %s', feature.label, row.id, error instanceof Error ? error.message : String(error));
            }
        }
        if (target.kind === 'role' && route !== undefined && findBindableRows(ctx, feature).length === 0) {
            warn('no loaded row carries %s; the binding stays dormant', feature.label);
        }
        if (target.kind === 'role' && route === undefined && findBindableRows(ctx, feature).length > 0) {
            warn('role "%s" bound to %s has no members; the feature keeps its own default', target.role ?? '', feature.label);
        }
    }
}
/** Render one binding for diagnostics. */
export function describeBinding(target, route) {
    if (target.kind !== 'role')
        return 'harness default';
    return route === undefined ? `role ${target.role ?? '(none)'} (unresolved)` : `role ${target.role ?? ''} -> ${routeLabel(route)}`;
}
//# sourceMappingURL=bindings.js.map