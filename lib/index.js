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
import { applyBindings } from "./bindings.js";
import { CapabilityDirectory } from "./capabilities.js";
import { FailoverRegistry, installFailover } from "./failover.js";
import { collisionAdvice, findOfficialModelSelectionRows } from "./official-tool.js";
import { DelegationPlanner } from "./plan.js";
import { registerDelegateTool } from "./tools/delegate.js";
import { registerListRolesTool } from "./tools/list-model-roles.js";
import { Config as RoleConfigSchema, inspectRoleConfig } from "./settings.js";
export const name = 'role-config';
/** Services the apply body reads immediately. */
export const inject = ['tools', 'agents'];
/** The plugin's Config schema, exported for the Loader. */
export const Config = RoleConfigSchema;
/** Read one detached settings snapshot from the live references. */
export function settingsSnapshot(config) {
    return {
        pool: config.pool.get(),
        roles: config.roles.get(),
        bindings: config.bindings.get(),
        exposure: config.exposure.get(),
        routing: config.routing.get(),
        delegate: config.delegate.get(),
    };
}
/** Whether an agent is a top-level session's agent rather than a delegate. */
export function isTopLevel(agent) {
    const { header } = agent.session;
    return header.origin !== 'subagent' && (header.delegationDepth ?? 0) === 0;
}
/**
 * Mount the role-config plugin.
 * @param ctx - the plugin's Host context.
 * @param config - live configuration references.
 */
export function apply(ctx, config) {
    /** One diagnostic, where both the operator's console and the log can see it. */
    const warn = (message, ...args) => {
        ctx.logger.warn(`role-config: ${message}`, ...args);
        // The shipped compositions mount no logger exporter, so an operator-facing
        // diagnostic must also reach the process console.
        console.warn(`[role-config] ${message}`, ...args);
    };
    const source = {
        settings: () => settingsSnapshot(config),
        problems: () => inspectRoleConfig(settingsSnapshot(config)),
    };
    const llm = ctx.get('llm');
    const capabilities = new CapabilityDirectory(llm);
    // Adapter routes come and go while the Host runs; cached facts must not
    // survive that.
    ctx.on('llm/adapters-updated', () => {
        capabilities.invalidate();
    });
    // Function bindings are re-derived whenever the settings or the adapter
    // catalog move; one serial queue keeps the writes ordered.
    let bindingSync = Promise.resolve();
    const syncBindings = () => {
        bindingSync = bindingSync.then(async () => {
            const settings = settingsSnapshot(config);
            if (settings.bindings.compact.kind === 'off' && settings.bindings.sessionTitle.kind === 'off')
                return;
            await capabilities.prepare(settings);
            await applyBindings({ ctx, settings, capabilities, warn });
        }).catch((error) => {
            warn('function binding sync failed: %s', error);
        });
    };
    const planner = new DelegationPlanner(() => settingsSnapshot(config), capabilities, llm, { warn });
    const failover = new FailoverRegistry({ warn }, () => settingsSnapshot(config).routing.fallback);
    installFailover(ctx, failover);
    // The shadow needs an outer-scope official tool; a colliding row is reported
    // once, and the official tool keeps serving for this session.
    const collisions = findOfficialModelSelectionRows(ctx, settingsSnapshot(config).delegate.toolName);
    if (collisions.length > 0) {
        warn(collisionAdvice(collisions, settingsSnapshot(config).delegate.toolName));
    }
    const installed = new Map();
    const reconcile = (agent) => {
        const previous = installed.get(agent);
        if (previous !== undefined) {
            installed.delete(agent);
            for (const fiber of [previous.catalog, previous.delegate]) {
                if (fiber === undefined)
                    continue;
                void fiber.dispose().catch((error) => {
                    warn('tool cleanup failed: %s', error);
                });
            }
        }
        const settings = settingsSnapshot(config);
        const entry = {};
        if (isTopLevel(agent) && settings.exposure.listTool) {
            entry.catalog = agent.ctx.inject(['tools'], (scope) => {
                registerListRolesTool(scope, source);
            });
        }
        if (settings.exposure.delegateTool && collisions.length === 0) {
            entry.delegate = agent.ctx.inject(['tools', 'subagents'], (scope) => {
                // Registration waits for the agent's composition to settle. Two
                // outcomes matter, and the wait is what separates them:
                //
                // - The official tool registered into an OUTER scope (a preset row
                //   with `modelSelectionSettings: false`): this scope's registration
                //   succeeds and the agent sees the routed tool. Enabling this plugin
                //   replaces the official `subagent`; disabling it leaves the official
                //   one serving.
                // - An official tool registered into THIS scope (a preset row with
                //   `modelSelectionSettings: true`): the registry refuses the
                //   duplicate, and registering before it would instead make the
                //   OFFICIAL registration throw where the session is created — a
                //   failed session rather than a diagnostic. The refused registration
                //   is reported with the two knobs that fix it.
                let registration;
                const settle = setTimeout(() => {
                    try {
                        registration = registerDelegateTool(scope, {
                            settings: () => settingsSnapshot(config),
                            planner,
                            failover,
                            warn: (message) => { warn(message); },
                        });
                    }
                    catch (error) {
                        // A duplicate name means another plugin owns `subagent` in this very
                        // scope; say which knob fixes it and leave that tool in place.
                        warn('could not register the delegation tool for agent %s: %s. Set modelSelectionSettings: false on the '
                            + 'official tool-subagent row, or point delegate.toolName at another name.', agent.id, error instanceof Error ? error.message : String(error));
                    }
                }, 0);
                return () => {
                    clearTimeout(settle);
                    registration?.();
                };
            });
        }
        if (entry.catalog !== undefined || entry.delegate !== undefined)
            installed.set(agent, entry);
    };
    for (const agent of ctx.agents.list())
        reconcile(agent);
    ctx.on('agent/created', ({ agent }) => {
        reconcile(agent);
    });
    ctx.on('agent/disposed', ({ agent }) => {
        installed.delete(agent);
        failover.forget(agent);
    });
    // A settings write must not need a remount: both tools follow their flags,
    // and the function bindings follow the roles they were pointed at.
    ctx.on('loader/volatile-update', () => {
        for (const agent of ctx.agents.list())
            reconcile(agent);
        syncBindings();
    });
    syncBindings();
    ctx.on('llm/adapters-updated', () => { syncBindings(); });
    ctx.logger.info('role-config: mounted');
}
//# sourceMappingURL=index.js.map