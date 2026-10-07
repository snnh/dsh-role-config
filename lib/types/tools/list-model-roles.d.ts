/**
 * The listing tool: the model asks, only then does it learn the roles and the
 * pool. Nothing about roles or models rides in the system prompt by default,
 * so a session that never delegates pays no tokens for the configuration.
 *
 * @module dsh-role-config/tools/list-model-roles
 */
import type { Context } from '@deepseek-ai/cordis';
import type { RoleConfigProblem, RoleConfigSettings } from '../settings.ts';
/** The settings reader the tool serves from. */
export interface RoleCatalogSource {
    /** Current settings snapshot. */
    settings(): RoleConfigSettings;
    /** Current cross-field findings; empty when the configuration is sound. */
    problems(): readonly RoleConfigProblem[];
}
/** Model-facing tool name. */
export declare const LIST_ROLES_TOOL_NAME = "list_model_roles";
/** Description shown to the model. */
export declare const LIST_ROLES_TOOL_DESCRIPTION: string;
/**
 * Register the listing tool on one scope.
 * @param ctx - the tool-hosting context (an agent scope, or the plugin's own).
 * @param source - the settings reader.
 * @returns the registration disposer.
 */
export declare function registerListRolesTool(ctx: Context, source: RoleCatalogSource): () => void;
//# sourceMappingURL=list-model-roles.d.ts.map