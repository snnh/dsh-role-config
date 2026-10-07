/**
 * The model-facing projection of the settings.
 *
 * What the model may know: role names and descriptions (never their members),
 * and pool models with the user's description so it can name one directly.
 * What it never sees here: a role's chain, its rules, or which model a role
 * would route to.
 *
 * @module dsh-role-config/catalog
 */
import type { RoleConfigProblem, RoleConfigSettings } from './settings.ts';
/** One role as the model sees it. */
export interface RoleView {
    /** Role id the delegation tool accepts as `role`. */
    readonly id: string;
    /** Display name. */
    readonly label: string;
    /** What the role is for. */
    readonly description: string;
    /** The group ("tier shelf") holding it. */
    readonly group: string;
}
/** One pool model as the model sees it. */
export interface ModelView {
    /** Provider route to pass with {@link ModelView.model}. */
    readonly provider: string;
    /** Model id to pass with {@link ModelView.provider}. */
    readonly model: string;
    /** Display name, when the user set one. */
    readonly label: string;
    /** The user's description of what this model is good at. */
    readonly description: string;
}
/** Everything the listing tool reports. */
export interface CatalogView {
    /** Configured roles, in group order. */
    readonly roles: RoleView[];
    /** Pool models the model may name directly. */
    readonly models: ModelView[];
    /** Configuration problems the user should fix, as short sentences. */
    readonly problems: string[];
}
/**
 * Project one settings snapshot for the model.
 * @param settings - current settings snapshot.
 * @param problems - validation findings to surface alongside the catalog.
 * @returns the projection served by the listing tool.
 */
export declare function projectCatalog(settings: RoleConfigSettings, problems: readonly RoleConfigProblem[]): CatalogView;
/**
 * Render the projection as compact text for the model.
 * @param view - the projection to render.
 * @returns the model-facing description, or a sentence saying nothing is set up.
 */
export declare function renderCatalog(view: CatalogView): string;
//# sourceMappingURL=catalog.d.ts.map