/**
 * Role presets and the model pool: the settings vocabulary, the plugin's
 * Config schema, and cross-field validation.
 *
 * Two user-authored parts live here. The **model pool** lists models the main
 * agent may name directly, each with the description the user wrote for it.
 * The **role presets** name roles (tiers the user extends freely) and decide,
 * per role, which model serves a request: user-written conditions first, then
 * the role's priority chain.
 *
 * A role never exposes its members to the model. Only the role's name and
 * description reach the model; the chain and its rules stay Host-side.
 *
 * @module dsh-role-config/settings
 */
import z from '@deepseek-ai/schemastery';
/** One exact provider/model route. */
export interface RouteMember {
    /** Registered LLM provider route. */
    readonly provider: string;
    /** Provider-owned exact model id. */
    readonly model: string;
}
/** One model the user admitted to the pool, with the user's own description. */
export interface PoolModel extends RouteMember {
    /** Optional display name; the settings page falls back to the model id. */
    readonly label?: string;
    /**
     * What this model is good at, in the user's words. This is the text the main
     * agent reads when choosing a model directly.
     */
    readonly description: string;
    /**
     * Capability tags the user declares by hand (`vision`, `long-context`, ...).
     * Rules fall back to these only where the live adapter discloses nothing.
     */
    readonly capabilities?: readonly string[];
}
/**
 * Conditions a routing rule tests. Every listed condition must hold; an
 * omitted or empty one is not a condition at all.
 */
export interface RouteCondition {
    /** The delegation prompt contains any of these substrings (case-insensitive). */
    readonly promptAny?: readonly string[];
    /** The delegation prompt matches this regular expression. */
    readonly promptRegex?: string;
    /** The member must declare every one of these input modalities (`image`, ...). */
    readonly modalities?: readonly string[];
    /** The member's declared context window must be at least this many tokens. */
    readonly minContextWindow?: number;
    /** The member must declare every one of these capability tags. */
    readonly capabilities?: readonly string[];
}
/** One user-written routing rule inside a role. */
export interface RouteRule {
    /** Optional label shown in the settings page. */
    readonly label?: string;
    /** What must hold for this rule to select {@link RouteRule.use}. */
    readonly when: RouteCondition;
    /** The role member this rule selects. */
    readonly use: RouteMember;
}
/**
 * One role preset: a name and description the model sees, the priority chain
 * used by default and for fallback, and the conditions that pick another
 * member first.
 */
export interface Role {
    /** Stable id referenced by bindings and by the model's `role` argument. */
    readonly id: string;
    /** Display name shown to the user and (with the description) to the model. */
    readonly label: string;
    /** What this role is for; the model reads this to choose a role. */
    readonly description?: string;
    /** Members in priority order: the head serves first, failure walks down. */
    readonly chain: readonly RouteMember[];
    /** Condition rules evaluated before the chain head, in order. */
    readonly rules?: readonly RouteRule[];
}
/** A user-defined tag group ("tier shelf") holding roles. */
export interface RoleGroup {
    /** Stable id; unique among groups. */
    readonly id: string;
    /** Display name of the group. */
    readonly label: string;
    /** Roles in this group. */
    readonly roles: readonly Role[];
}
/** One function a role may serve, or `off` for the harness default. */
export interface BindingTarget {
    /** Whether the function keeps its harness default or follows a role. */
    readonly kind: 'off' | 'role';
    /** The role id when {@link BindingTarget.kind} is `role`. */
    readonly role?: string;
}
/** Per-function role bindings. */
export interface Bindings {
    /** Context compaction's summarization route. */
    readonly compact: BindingTarget;
    /** Session-title generation's route. */
    readonly sessionTitle: BindingTarget;
    /** Role used when a delegation names neither a role nor a model. */
    readonly delegateDefault: BindingTarget;
}
/** What the model may see, and how. */
export interface Exposure {
    /** Register the on-demand role/pool listing tool. */
    readonly listTool: boolean;
    /** Insert the role and model descriptions at the start of each session. */
    readonly sessionStart: boolean;
    /** Register the role-routing delegation tool. */
    readonly delegateTool: boolean;
}
/** Routing behaviour shared by every role. */
export interface Routing {
    /** Walk the role chain after a terminal request failure. */
    readonly fallback: boolean;
    /** Ask a router model when no condition rule matched. */
    readonly aiEnabled: boolean;
    /** Router model provider route. */
    readonly aiProvider?: string;
    /** Router model id. */
    readonly aiModel?: string;
    /** Deadline for one router decision in milliseconds. */
    readonly aiTimeoutMs: number;
}
/** Delegation settings of the routing tool. */
export interface DelegateConfig {
    /** Registered subagent provider the tool starts runs on (e.g. `spawn`). */
    readonly provider: string;
    /** Model-facing tool name; must match the official tool it shadows. */
    readonly toolName: string;
    /** Expose `run_in_background`. */
    readonly enableRunInBackground: boolean;
}
/** The complete settings section this plugin owns. */
export interface RoleConfigSettings {
    /** Models the main agent may name directly, with the user's descriptions. */
    readonly pool: readonly PoolModel[];
    /** Role presets, grouped like the tiers they generalize. */
    readonly groups: readonly RoleGroup[];
    /** Per-function role bindings. */
    readonly bindings: Bindings;
    /** Model-visible surfaces. */
    readonly exposure: Exposure;
    /** Routing behaviour. */
    readonly routing: Routing;
    /** Delegation tool wiring. */
    readonly delegate: DelegateConfig;
}
/**
 * Plugin configuration. Every field is volatile so the Plugins page edits the
 * live section, and every field carries a default so a deployment that states
 * nothing still boots with the feature off.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    pool: z<NoInfer<({
        provider?: string | null;
        model?: string | null;
        label?: string | null;
        description?: string | null;
        capabilities?: string[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
        label: z<string, string, "plain">;
        description: z<string, string, "defined">;
        capabilities: z<string[], string[], "defined">;
    }>>[]>, "volatile-defined">;
    groups: z<NoInfer<({
        id?: string | null;
        label?: string | null;
        roles?: ({
            id?: string | null;
            label?: string | null;
            description?: string | null;
            chain?: ({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
            rules?: ({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
        } & import("@deepseek-ai/cosmokit").Dict)[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        id: z<string, string, "defined">;
        label: z<string, string, "defined">;
        roles: z<({
            id?: string | null;
            label?: string | null;
            description?: string | null;
            chain?: ({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
            rules?: ({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
        } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
            id: z<string, string, "defined">;
            label: z<string, string, "defined">;
            description: z<string, string, "plain">;
            chain: z<({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
                provider: z<string, string, "defined">;
                model: z<string, string, "defined">;
            }>>[], "defined">;
            rules: z<({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
                label: z<string, string, "plain">;
                when: z<Schemastery.ObjectS<NoInfer<{
                    promptAny: z<string[], string[], "defined">;
                    promptRegex: z<string, string, "plain">;
                    modalities: z<string[], string[], "defined">;
                    minContextWindow: z<number, number, "defined">;
                    capabilities: z<string[], string[], "defined">;
                }>>, Schemastery.ObjectT<NoInfer<{
                    promptAny: z<string[], string[], "defined">;
                    promptRegex: z<string, string, "plain">;
                    modalities: z<string[], string[], "defined">;
                    minContextWindow: z<number, number, "defined">;
                    capabilities: z<string[], string[], "defined">;
                }>>, "defined">;
                use: z<Schemastery.ObjectS<NoInfer<{
                    provider: z<string, string, "defined">;
                    model: z<string, string, "defined">;
                }>>, Schemastery.ObjectT<NoInfer<{
                    provider: z<string, string, "defined">;
                    model: z<string, string, "defined">;
                }>>, "defined">;
            }>>[], "defined">;
        }>>[], "defined">;
    }>>[]>, "volatile-defined">;
    bindings: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        compact: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        compact: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
    }>>>, "volatile-defined">;
    exposure: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        listTool: z<boolean, boolean, "defined">;
        sessionStart: z<boolean, boolean, "defined">;
        delegateTool: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        listTool: z<boolean, boolean, "defined">;
        sessionStart: z<boolean, boolean, "defined">;
        delegateTool: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
    routing: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        fallback: z<boolean, boolean, "defined">;
        aiEnabled: z<boolean, boolean, "defined">;
        aiProvider: z<string, string, "plain">;
        aiModel: z<string, string, "plain">;
        aiTimeoutMs: z<number, number, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        fallback: z<boolean, boolean, "defined">;
        aiEnabled: z<boolean, boolean, "defined">;
        aiProvider: z<string, string, "plain">;
        aiModel: z<string, string, "plain">;
        aiTimeoutMs: z<number, number, "defined">;
    }>>>, "volatile-defined">;
    delegate: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: z<string, string, "defined">;
        toolName: z<string, string, "defined">;
        enableRunInBackground: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        toolName: z<string, string, "defined">;
        enableRunInBackground: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    pool: z<NoInfer<({
        provider?: string | null;
        model?: string | null;
        label?: string | null;
        description?: string | null;
        capabilities?: string[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
        label: z<string, string, "plain">;
        description: z<string, string, "defined">;
        capabilities: z<string[], string[], "defined">;
    }>>[]>, "volatile-defined">;
    groups: z<NoInfer<({
        id?: string | null;
        label?: string | null;
        roles?: ({
            id?: string | null;
            label?: string | null;
            description?: string | null;
            chain?: ({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
            rules?: ({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
        } & import("@deepseek-ai/cosmokit").Dict)[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        id: z<string, string, "defined">;
        label: z<string, string, "defined">;
        roles: z<({
            id?: string | null;
            label?: string | null;
            description?: string | null;
            chain?: ({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
            rules?: ({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[] | null;
        } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
            id: z<string, string, "defined">;
            label: z<string, string, "defined">;
            description: z<string, string, "plain">;
            chain: z<({
                provider?: string | null;
                model?: string | null;
            } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
                provider: z<string, string, "defined">;
                model: z<string, string, "defined">;
            }>>[], "defined">;
            rules: z<({
                label?: string | null;
                when?: ({
                    promptAny?: string[] | null;
                    promptRegex?: string | null;
                    modalities?: string[] | null;
                    minContextWindow?: number | null;
                    capabilities?: string[] | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
                use?: ({
                    provider?: string | null;
                    model?: string | null;
                } & import("@deepseek-ai/cosmokit").Dict) | null;
            } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
                label: z<string, string, "plain">;
                when: z<Schemastery.ObjectS<NoInfer<{
                    promptAny: z<string[], string[], "defined">;
                    promptRegex: z<string, string, "plain">;
                    modalities: z<string[], string[], "defined">;
                    minContextWindow: z<number, number, "defined">;
                    capabilities: z<string[], string[], "defined">;
                }>>, Schemastery.ObjectT<NoInfer<{
                    promptAny: z<string[], string[], "defined">;
                    promptRegex: z<string, string, "plain">;
                    modalities: z<string[], string[], "defined">;
                    minContextWindow: z<number, number, "defined">;
                    capabilities: z<string[], string[], "defined">;
                }>>, "defined">;
                use: z<Schemastery.ObjectS<NoInfer<{
                    provider: z<string, string, "defined">;
                    model: z<string, string, "defined">;
                }>>, Schemastery.ObjectT<NoInfer<{
                    provider: z<string, string, "defined">;
                    model: z<string, string, "defined">;
                }>>, "defined">;
            }>>[], "defined">;
        }>>[], "defined">;
    }>>[]>, "volatile-defined">;
    bindings: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        compact: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        compact: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: z<Schemastery.ObjectS<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: z<"off" | "role", "off" | "role", "defined">;
            role: z<string, string, "plain">;
        }>>, "defined">;
    }>>>, "volatile-defined">;
    exposure: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        listTool: z<boolean, boolean, "defined">;
        sessionStart: z<boolean, boolean, "defined">;
        delegateTool: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        listTool: z<boolean, boolean, "defined">;
        sessionStart: z<boolean, boolean, "defined">;
        delegateTool: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
    routing: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        fallback: z<boolean, boolean, "defined">;
        aiEnabled: z<boolean, boolean, "defined">;
        aiProvider: z<string, string, "plain">;
        aiModel: z<string, string, "plain">;
        aiTimeoutMs: z<number, number, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        fallback: z<boolean, boolean, "defined">;
        aiEnabled: z<boolean, boolean, "defined">;
        aiProvider: z<string, string, "plain">;
        aiModel: z<string, string, "plain">;
        aiTimeoutMs: z<number, number, "defined">;
    }>>>, "volatile-defined">;
    delegate: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: z<string, string, "defined">;
        toolName: z<string, string, "defined">;
        enableRunInBackground: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        toolName: z<string, string, "defined">;
        enableRunInBackground: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, "plain">;
/** Stable identity for one exact route. */
export declare function routeKey(route: RouteMember): string;
/** Human-readable `provider/model` for diagnostics and descriptions. */
export declare function routeLabel(route: RouteMember): string;
/** One validation failure, addressed to a settings path the editor can show. */
export interface RoleConfigProblem {
    /** Dotted path into the settings document. */
    readonly path: string;
    /** What is wrong, in one sentence. */
    readonly message: string;
}
/** Whether a condition lists nothing at all. */
export declare function conditionIsEmpty(condition: RouteCondition): boolean;
/**
 * Check the cross-field rules the Config schema cannot express.
 *
 * Findings are returned rather than thrown so the Host can serve a partially
 * configured section (the routing then reports what is wrong) while the
 * editor blocks a save that would introduce them.
 *
 * @param settings - the settings snapshot to inspect.
 * @returns every problem found, in document order.
 */
export declare function inspectRoleConfig(settings: RoleConfigSettings): RoleConfigProblem[];
/**
 * Reject a settings document that may not serve traffic.
 *
 * @param settings - candidate settings.
 * @throws Error naming every problem found, for Host-side load diagnostics.
 */
export declare function assertRoleConfig(settings: RoleConfigSettings): void;
//# sourceMappingURL=settings.d.ts.map