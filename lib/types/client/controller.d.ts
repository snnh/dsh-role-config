/**
 * The Role Config page's controller: one staged draft over the live settings
 * namespace, the adapter catalog joined with the pool, and the actions the
 * page renders.
 *
 * The page never writes on every keystroke. Edits land in a detached draft,
 * and `save()` sends the six top-level fields as one revision-fenced
 * mutation, so a document changed elsewhere is never silently overwritten.
 *
 * @module dsh-role-config/client/controller
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsFormScope, SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives';
import type { Bindings, DelegateConfig, Exposure, PoolModel, Role, RoleConfigSettings, RoleGroup, RouteCondition, RouteMember, RouteRule, Routing } from '../settings.ts';
import type { RoleConfigProblem } from '../settings.ts';
/** Settings namespace this page edits (the Loader row id). */
export declare const ROLE_CONFIG_NS = "role-config";
/** One catalog row joined with the pool. */
export interface CatalogRow {
    readonly provider: string;
    readonly providerName: string;
    readonly model: string;
    readonly modelName: string;
    /** Whether the current adapter catalog still advertises this route. */
    readonly available: boolean;
    /** Whether the draft holds it. */
    readonly selected: boolean;
}
/** One provider group of the pool picker. */
export interface CatalogGroup {
    readonly provider: string;
    readonly providerName: string;
    readonly rows: readonly CatalogRow[];
}
/** The snapshot the page renders. */
export interface RoleConfigPageState extends SettingsFormShell {
    /** Staged settings, or the stored value when nothing is staged. */
    readonly draft: RoleConfigSettings;
    /** Whether the draft differs from the stored value. */
    readonly dirty: boolean;
    /** Validation findings for the draft. */
    readonly problems: readonly RoleConfigProblem[];
    /** Catalog status of the adapter directory. */
    readonly catalogStatus: 'idle' | 'loading' | 'ready' | 'error';
    /** Whether any provider-local catalog request failed. */
    readonly catalogPartial: boolean;
    /** Provider groups of the picker: catalog rows plus retained unknown routes. */
    readonly catalog: readonly CatalogGroup[];
    /** Whether a newer Host revision invalidated the draft. */
    readonly conflicted: boolean;
}
/** Actions and hooks the page binds. */
export interface RoleConfigPageFace {
    hooks: {
        /** Page snapshot bound by the renderer as useRoleConfigPage. */
        roleConfigPage: SnapshotStore<RoleConfigPageState>;
    };
    /** Load (or reload) the adapter catalog. */
    retryCatalog: () => void;
    /** Stage a whole draft. */
    edit: (update: (draft: RoleConfigSettings) => RoleConfigSettings) => void;
    /** Persist the staged draft. */
    save: () => void;
    /** Drop the staged draft. */
    discard: () => void;
}
/** Whether one route still has an entry in the pool. */
export declare function poolHas(settings: RoleConfigSettings, route: RouteMember): boolean;
/** Bridges the settings namespace, the adapter directory, and one staged draft. */
export declare class RoleConfigPageController {
    private readonly scope;
    private readonly ctx;
    private draft;
    private draftRevision;
    private catalogGroups;
    private catalogStatus;
    private catalogPartial;
    private saving;
    private conflicted;
    private disposed;
    private saveGeneration;
    private catalogGeneration;
    private readonly store;
    private readonly unsubscribe;
    /**
     * @param scope - the bound `role-config` settings form.
     * @param ctx - the page plugin's context, whose `remote.session` namespace
     * answers the Host model catalog.
     */
    constructor(scope: SettingsFormScope<RoleConfigSettings>, ctx: ClientContext);
    /** Stop observing settings and suppress late settlements. */
    dispose(): void;
    /** The renderer face for this page. */
    inject(): RoleConfigPageFace;
    /** Load the adapter catalog once per request, keeping the last good one. */
    loadCatalog(): Promise<void>;
    private current;
    private staged;
    private edit;
    private discard;
    private save;
    /** Build the picker: catalog rows plus pool routes the adapter dropped. */
    private catalog;
    private projection;
    private publish;
}
/** Convenience: one pool entry for a catalog row. */
export declare function poolEntryFor(provider: string, model: string, description?: string): PoolModel;
/** Convenience: the settings fields the page edits, in save order. */
export type { Bindings, DelegateConfig, Exposure, Role, RoleGroup, RouteCondition, RouteMember, RouteRule, Routing };
//# sourceMappingURL=controller.d.ts.map