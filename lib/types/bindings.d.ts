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
import type { Context } from '@deepseek-ai/cordis';
import type { CapabilityDirectory } from './capabilities.ts';
import type { BindingTarget, RoleConfigSettings, RouteMember } from './settings.ts';
/** One bindable feature: the rows it may live on and the pair it writes. */
export interface BindableFeature {
    /** Settings key of this binding. */
    readonly key: 'compact' | 'sessionTitle';
    /** Module names that own the pair. */
    readonly modules: readonly string[];
    /** The provider/model field names, in that order. */
    readonly fields: readonly [string, string];
    /** One sentence for diagnostics. */
    readonly label: string;
}
/** The features this plugin binds today. */
export declare const BINDABLE_FEATURES: readonly BindableFeature[];
/** One loader row a binding may write. */
export interface BindableRow {
    /** Loader entry the editor reconciles. */
    readonly entry: unknown;
    /** Row id, for diagnostics. */
    readonly id: string;
    /** Feature this row belongs to. */
    readonly feature: BindableFeature;
}
/** The config editor face this module needs (a subset of `ctx.configEditor`). */
export interface BindingEditor {
    /**
     * Validate, persist, and reconcile one row's next config.
     * @param entry - the Loader entry to edit.
     * @param change - derive the next raw config from the current and inherited ones.
     */
    edit(entry: never, change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>): Promise<void>;
}
/**
 * Find the live rows a binding may write.
 * @param ctx - the plugin's Host context (the Loader is read when present).
 * @param feature - the feature to look for.
 * @returns one row per live module, outermost first.
 */
export declare function findBindableRows(ctx: Context, feature: BindableFeature): BindableRow[];
/**
 * Resolve the route a binding should write, preferring a member an adapter
 * currently serves.
 * @param settings - current settings snapshot.
 * @param capabilities - cached availability of pool routes.
 * @param target - the binding to resolve.
 * @returns the route to write, or undefined when the binding is off, the role
 * is missing or empty, or nothing can be written.
 */
export declare function resolveBindingRoute(settings: RoleConfigSettings, capabilities: CapabilityDirectory, target: BindingTarget): RouteMember | undefined;
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
export declare function applyBindings(options: {
    ctx: Context;
    settings: RoleConfigSettings;
    capabilities: CapabilityDirectory;
    warn: (message: string, ...args: unknown[]) => void;
}): Promise<void>;
/** Render one binding for diagnostics. */
export declare function describeBinding(target: BindingTarget, route: RouteMember | undefined): string;
//# sourceMappingURL=bindings.d.ts.map