/**
 * dsh-role-config: role presets and a model pool for delegation.
 *
 * Two model-visible surfaces, both off until configured:
 *
 * - `list_model_roles` answers what roles exist and which pool models the
 *   model may name. It is registered on top-level agents only: a delegated
 *   child learns its role from the task it was handed.
 * - The delegation tool (`subagent` by default) accepts `role` or an explicit
 *   pool route and lets the operator's rules pick the model.
 *
 * A role's members never reach the model: the listing carries names and
 * descriptions only, and routing stays Host-side.
 *
 * @module dsh-role-config
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Bindings, DelegateConfig, Exposure, PoolModel, RoleConfigSettings, Role, Routing } from './settings.ts';
export declare const name = "role-config";
/** Services the apply body reads immediately. */
export declare const inject: string[];
/**
 * Plugin configuration: every field is a live reference the Plugins page can
 * edit, so a settings write takes effect without remounting the plugin.
 */
export interface Config {
    /** Models the main agent may name directly, with the user's descriptions. */
    pool: Volatile<PoolModel[]>;
    /** Role presets the delegation tool accepts by id. */
    roles: Volatile<Role[]>;
    /** Per-function role bindings. */
    bindings: Volatile<Bindings>;
    /** Model-visible surfaces. */
    exposure: Volatile<Exposure>;
    /** Routing behaviour. */
    routing: Volatile<Routing>;
    /** Delegation tool wiring. */
    delegate: Volatile<DelegateConfig>;
}
/** The plugin's Config schema, exported for the Loader. */
export declare const Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
    pool: import("@deepseek-ai/schemastery").default<NoInfer<({
        provider?: string | null;
        model?: string | null;
        label?: string | null;
        description?: string | null;
        capabilities?: string[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        label: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        description: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
    }>>[]>, "volatile-defined">;
    roles: import("@deepseek-ai/schemastery").default<NoInfer<({
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
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        id: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        label: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        description: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        chain: import("@deepseek-ai/schemastery").default<({
            provider?: string | null;
            model?: string | null;
        } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>[], "defined">;
        rules: import("@deepseek-ai/schemastery").default<({
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
            label: import("@deepseek-ai/schemastery").default<string, string, "plain">;
            when: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
                promptAny: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                promptRegex: import("@deepseek-ai/schemastery").default<string, string, "plain">;
                modalities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                minContextWindow: import("@deepseek-ai/schemastery").default<number, number, "defined">;
                capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
            }>>, Schemastery.ObjectT<NoInfer<{
                promptAny: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                promptRegex: import("@deepseek-ai/schemastery").default<string, string, "plain">;
                modalities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                minContextWindow: import("@deepseek-ai/schemastery").default<number, number, "defined">;
                capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
            }>>, "defined">;
            use: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
                provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
                model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            }>>, Schemastery.ObjectT<NoInfer<{
                provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
                model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            }>>, "defined">;
        }>>[], "defined">;
    }>>[]>, "volatile-defined">;
    bindings: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        compact: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        compact: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
    }>>>, "volatile-defined">;
    exposure: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        listTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        sessionStart: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        delegateTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        listTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        sessionStart: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        delegateTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
    routing: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        fallback: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiEnabled: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiProvider: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiModel: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        fallback: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiEnabled: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiProvider: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiModel: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
    }>>>, "volatile-defined">;
    delegate: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        toolName: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        enableRunInBackground: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        toolName: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        enableRunInBackground: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    pool: import("@deepseek-ai/schemastery").default<NoInfer<({
        provider?: string | null;
        model?: string | null;
        label?: string | null;
        description?: string | null;
        capabilities?: string[] | null;
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        label: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        description: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
    }>>[]>, "volatile-defined">;
    roles: import("@deepseek-ai/schemastery").default<NoInfer<({
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
    } & import("@deepseek-ai/cosmokit").Dict)[]>, NoInfer<Schemastery.ObjectT<NoInfer<{
        id: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        label: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        description: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        chain: import("@deepseek-ai/schemastery").default<({
            provider?: string | null;
            model?: string | null;
        } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>[], "defined">;
        rules: import("@deepseek-ai/schemastery").default<({
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
            label: import("@deepseek-ai/schemastery").default<string, string, "plain">;
            when: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
                promptAny: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                promptRegex: import("@deepseek-ai/schemastery").default<string, string, "plain">;
                modalities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                minContextWindow: import("@deepseek-ai/schemastery").default<number, number, "defined">;
                capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
            }>>, Schemastery.ObjectT<NoInfer<{
                promptAny: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                promptRegex: import("@deepseek-ai/schemastery").default<string, string, "plain">;
                modalities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
                minContextWindow: import("@deepseek-ai/schemastery").default<number, number, "defined">;
                capabilities: import("@deepseek-ai/schemastery").default<string[], string[], "defined">;
            }>>, "defined">;
            use: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
                provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
                model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            }>>, Schemastery.ObjectT<NoInfer<{
                provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
                model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            }>>, "defined">;
        }>>[], "defined">;
    }>>[]>, "volatile-defined">;
    bindings: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        compact: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        compact: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        sessionTitle: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
        delegateDefault: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            kind: import("@deepseek-ai/schemastery").default<"off" | "role", "off" | "role", "defined">;
            role: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        }>>, "defined">;
    }>>>, "volatile-defined">;
    exposure: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        listTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        sessionStart: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        delegateTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        listTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        sessionStart: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        delegateTool: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
    routing: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        fallback: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiEnabled: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiProvider: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiModel: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        fallback: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiEnabled: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        aiProvider: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiModel: import("@deepseek-ai/schemastery").default<string, string, "plain">;
        aiTimeoutMs: import("@deepseek-ai/schemastery").default<number, number, "defined">;
    }>>>, "volatile-defined">;
    delegate: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        toolName: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        enableRunInBackground: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        toolName: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        enableRunInBackground: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, "plain">;
/** Read one detached settings snapshot from the live references. */
export declare function settingsSnapshot(config: Config): RoleConfigSettings;
/** Whether an agent is a top-level session's agent rather than a delegate. */
export declare function isTopLevel(agent: Agent): boolean;
/**
 * Mount the role-config plugin.
 * @param ctx - the plugin's Host context.
 * @param config - live configuration references.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map