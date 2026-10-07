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
const routeMember = z.object({
    provider: z.string().required(),
    model: z.string().required(),
});
const bindingTarget = z.object({
    kind: z.union(['off', 'role']).default('off'),
    role: z.string(),
});
/**
 * Plugin configuration. Every field is volatile so the Plugins page edits the
 * live section, and every field carries a default so a deployment that states
 * nothing still boots with the feature off.
 */
export const Config = z.object({
    pool: z.array(z.object({
        provider: z.string().required(),
        model: z.string().required(),
        label: z.string(),
        description: z.string().default(''),
        capabilities: z.array(z.string()).default([]),
    })).default([]).volatile(),
    groups: z.array(z.object({
        id: z.string().required(),
        label: z.string().required(),
        roles: z.array(z.object({
            id: z.string().required(),
            label: z.string().required(),
            description: z.string(),
            chain: z.array(routeMember).default([]),
            rules: z.array(z.object({
                label: z.string(),
                when: z.object({
                    promptAny: z.array(z.string()).default([]),
                    promptRegex: z.string(),
                    modalities: z.array(z.string()).default([]),
                    minContextWindow: z.number().default(0),
                    capabilities: z.array(z.string()).default([]),
                }).default({}),
                // `use` stays optional in the schema so a half-written row never
                // bricks the Host; inspectRoleConfig() reports it to the editor.
                use: routeMember.default({ provider: '', model: '' }),
            })).default([]),
        })).default([]),
    })).default([]).volatile(),
    bindings: z.object({
        compact: bindingTarget.default({ kind: 'off' }),
        sessionTitle: bindingTarget.default({ kind: 'off' }),
        delegateDefault: bindingTarget.default({ kind: 'off' }),
    }).default({}).volatile(),
    exposure: z.object({
        listTool: z.boolean().default(true),
        sessionStart: z.boolean().default(false),
        delegateTool: z.boolean().default(true),
    }).default({}).volatile(),
    routing: z.object({
        fallback: z.boolean().default(true),
        aiEnabled: z.boolean().default(false),
        aiProvider: z.string(),
        aiModel: z.string(),
        aiTimeoutMs: z.number().default(8000),
    }).default({}).volatile(),
    delegate: z.object({
        provider: z.string().default('spawn'),
        toolName: z.string().default('subagent'),
        enableRunInBackground: z.boolean().default(true),
    }).default({}).volatile(),
});
/** Stable identity for one exact route. */
export function routeKey(route) {
    return `${route.provider}\u0000${route.model}`;
}
/** Human-readable `provider/model` for diagnostics and descriptions. */
export function routeLabel(route) {
    return `${route.provider}/${route.model}`;
}
/** Whether a condition lists nothing at all. */
export function conditionIsEmpty(condition) {
    return (condition.promptAny ?? []).length === 0
        && (condition.promptRegex ?? '').length === 0
        && (condition.modalities ?? []).length === 0
        && (condition.minContextWindow ?? 0) <= 0
        && (condition.capabilities ?? []).length === 0;
}
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
export function inspectRoleConfig(settings) {
    const problems = [];
    const poolKeys = new Map();
    settings.pool.forEach((entry, index) => {
        const path = `pool.${index}`;
        if (entry.provider.trim().length === 0 || entry.model.trim().length === 0) {
            problems.push({ path, message: 'a pool entry needs both a provider and a model' });
            return;
        }
        const key = routeKey(entry);
        const previous = poolKeys.get(key);
        if (previous !== undefined) {
            problems.push({ path, message: `duplicate pool entry for ${routeLabel(entry)} (also at ${previous})` });
            return;
        }
        poolKeys.set(key, path);
    });
    const roleIds = new Map();
    settings.groups.forEach((group, groupIndex) => {
        const groupPath = `groups.${groupIndex}`;
        if (group.id.trim().length === 0) {
            problems.push({ path: `${groupPath}.id`, message: 'a tag group needs an id' });
        }
        group.roles.forEach((role, roleIndex) => {
            const rolePath = `${groupPath}.roles.${roleIndex}`;
            if (role.id.trim().length === 0) {
                problems.push({ path: `${rolePath}.id`, message: 'a role needs an id' });
            }
            else {
                const previous = roleIds.get(role.id);
                if (previous !== undefined) {
                    problems.push({ path: `${rolePath}.id`, message: `duplicate role id "${role.id}" (also at ${previous})` });
                }
                else {
                    roleIds.set(role.id, `${rolePath}.id`);
                }
            }
            const inChain = new Set();
            role.chain.forEach((member, memberIndex) => {
                const key = routeKey(member);
                if (!poolKeys.has(key)) {
                    problems.push({
                        path: `${rolePath}.chain.${memberIndex}`,
                        message: `${routeLabel(member)} is not in the model pool`,
                    });
                }
                if (inChain.has(key)) {
                    problems.push({
                        path: `${rolePath}.chain.${memberIndex}`,
                        message: `${routeLabel(member)} appears twice in this role`,
                    });
                }
                inChain.add(key);
            });
            for (const [ruleIndex, rule] of (role.rules ?? []).entries()) {
                const rulePath = `${rolePath}.rules.${ruleIndex}`;
                if (!inChain.has(routeKey(rule.use))) {
                    problems.push({
                        path: `${rulePath}.use`,
                        message: `${routeLabel(rule.use)} is not a member of role "${role.id}"`,
                    });
                }
                const regex = rule.when.promptRegex;
                if (regex !== undefined && regex.length > 0) {
                    try {
                        void new RegExp(regex);
                    }
                    catch (error) {
                        problems.push({
                            path: `${rulePath}.when.promptRegex`,
                            message: `invalid regular expression: ${error instanceof Error ? error.message : String(error)}`,
                        });
                    }
                }
                if (conditionIsEmpty(rule.when)) {
                    problems.push({ path: `${rulePath}.when`, message: 'a rule needs at least one condition' });
                }
            }
        });
    });
    // A partially written document reaches this check through the Host's own
    // resolution; a missing group must be reported, never crash the read.
    const configuredBindings = settings.bindings ?? {};
    const bindings = [
        [configuredBindings.compact, 'bindings.compact'],
        [configuredBindings.sessionTitle, 'bindings.sessionTitle'],
        [configuredBindings.delegateDefault, 'bindings.delegateDefault'],
    ];
    for (const [binding, path] of bindings) {
        if (binding?.kind !== 'role')
            continue;
        const role = binding.role ?? '';
        if (role.length === 0) {
            problems.push({ path: `${path}.role`, message: 'choose a role or turn this binding off' });
        }
        else if (!roleIds.has(role)) {
            problems.push({ path: `${path}.role`, message: `role "${role}" does not exist` });
        }
    }
    if ((settings.routing ?? {}).aiEnabled === true) {
        const provider = settings.routing?.aiProvider ?? '';
        const model = settings.routing?.aiModel ?? '';
        if (provider.length === 0 || model.length === 0) {
            problems.push({
                path: 'routing.aiProvider',
                message: 'AI routing needs a router model (provider and model together)',
            });
        }
        const timeout = settings.routing?.aiTimeoutMs ?? 0;
        if (!Number.isFinite(timeout) || timeout <= 0) {
            problems.push({ path: 'routing.aiTimeoutMs', message: 'the router deadline must be a positive number' });
        }
    }
    if ((settings.delegate?.provider ?? '').trim().length === 0) {
        problems.push({ path: 'delegate.provider', message: 'the delegation tool needs a subagent provider name' });
    }
    if ((settings.delegate?.toolName ?? '').trim().length === 0) {
        problems.push({ path: 'delegate.toolName', message: 'the delegation tool needs a tool name' });
    }
    return problems;
}
/**
 * Reject a settings document that may not serve traffic.
 *
 * @param settings - candidate settings.
 * @throws Error naming every problem found, for Host-side load diagnostics.
 */
export function assertRoleConfig(settings) {
    const problems = inspectRoleConfig(settings);
    if (problems.length > 0) {
        throw new Error(`role-config: ${problems.map(problem => `${problem.path}: ${problem.message}`).join('; ')}`);
    }
}
//# sourceMappingURL=settings.js.map