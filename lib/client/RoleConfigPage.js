import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Role Config page: the model pool, the role presets with their chains and
 * routing rules, and the switches that decide what the model may see.
 *
 * Controls are native elements with inline styles on purpose: this page ships
 * inside a fresh plugin bundle, and every extra shared dependency is a module
 * request the module table has to answer.
 *
 * @module dsh-role-config/client/RoleConfigPage
 */
import { useId } from 'react';
import { SettingsForm } from '@deepseek-ai/dsh-client-ui-primitives';
import { poolHas } from "./controller.js";
const label = { display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 2 };
const field = { width: '100%', boxSizing: 'border-box' };
const section = { display: 'grid', gap: 10, marginBottom: 22 };
const row = { display: 'grid', gap: 8, padding: '8px 0', borderTop: '1px solid rgba(127,127,127,0.2)' };
const inline = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const muted = { fontSize: 12, opacity: 0.7 };
const mono = { fontFamily: 'ui-monospace, monospace', fontSize: 12 };
/**
 * Render the Role Config settings form.
 * @param props - locale copy, the page snapshot, and its actions.
 * @returns the summary line or the editable form.
 */
export function RoleConfigPage(props) {
    const { t } = props;
    const state = props.useRoleConfigPage(snapshot => snapshot);
    const headingId = useId();
    if (props.view === 'summary')
        return t('description');
    return (_jsxs(SettingsForm, { labels: {
            unavailable: t('unavailable'),
            readOnly: t('notWritable'),
            saveFailed: t('conflict'),
            save: t('save'),
            saving: t('saving'),
        }, state: state, onSave: props.save, onDiscard: props.discard, children: [_jsx("p", { style: muted, children: t('description') }), _jsx(PoolSection, { t: t, state: state, edit: props.edit, retryCatalog: props.retryCatalog, headingId: headingId }), _jsx(RolesSection, { t: t, state: state, edit: props.edit, headingId: headingId }), _jsx(SwitchSection, { t: t, state: state, edit: props.edit, headingId: headingId }), state.problems.length > 0
                ? (_jsxs("section", { "aria-labelledby": `${headingId}-problems`, children: [_jsx("h3", { id: `${headingId}-problems`, children: t('problemTitle') }), _jsx("ul", { children: state.problems.map(problem => _jsxs("li", { style: muted, children: [problem.path, ": ", problem.message] }, `${problem.path}:${problem.message}`)) })] }))
                : null] }));
}
/** The pool picker, the pool rows, and the descriptions the model reads. */
function PoolSection(props) {
    const { t, state } = props;
    const settings = state.draft;
    const toggle = (row) => {
        props.edit((draft) => {
            const exists = draft.pool.some(entry => entry.provider === row.provider && entry.model === row.model);
            return {
                ...draft,
                pool: exists
                    ? draft.pool.filter(entry => !(entry.provider === row.provider && entry.model === row.model))
                    : [...draft.pool, { provider: row.provider, model: row.model, description: '' }],
            };
        });
    };
    const update = (index, patch) => {
        props.edit((draft) => ({
            ...draft,
            pool: draft.pool.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)),
        }));
    };
    return (_jsxs("section", { style: section, "aria-labelledby": props.headingId + '-pool', children: [_jsx("h3", { id: props.headingId + '-pool', children: t('poolTitle') }), _jsx("p", { style: muted, children: t('poolHint') }), settings.pool.length === 0 ? _jsx("p", { style: muted, children: t('poolEmpty') }) : null, settings.pool.map((entry, index) => (_jsxs("div", { style: row, children: [_jsxs("div", { style: inline, children: [_jsxs("span", { style: mono, children: [entry.provider, "/", entry.model] }), !poolHas(settings, entry) || state.catalog.some(group => group.rows.some(r => r.provider === entry.provider && r.model === entry.model && !r.available))
                                ? _jsx("span", { style: muted, children: t('poolUnavailable') })
                                : null, _jsx("button", { type: "button", onClick: () => { toggle({ provider: entry.provider, model: entry.model, selected: true, available: true, providerName: entry.provider, modelName: entry.model }); }, children: t('poolRemove') })] }), _jsxs("label", { style: label, children: [t('poolLabel'), _jsx("input", { style: field, value: entry.label ?? '', onChange: event => { update(index, { label: event.target.value }); } })] }), _jsxs("label", { style: label, children: [t('poolDescription'), _jsx("textarea", { style: field, rows: 2, value: entry.description, onChange: event => { update(index, { description: event.target.value }); } })] }), _jsxs("label", { style: label, children: [t('poolCapabilities'), _jsx("input", { style: field, placeholder: t('poolCapabilitiesHint'), value: (entry.capabilities ?? []).join(', '), onChange: event => { update(index, { capabilities: splitList(event.target.value) }); } })] })] }, `${entry.provider}/${entry.model}`))), _jsxs("div", { style: inline, children: [_jsx("strong", { style: muted, children: t('poolAdd') }), _jsx("button", { type: "button", onClick: props.retryCatalog, children: t('poolRetry') }), _jsx("span", { style: muted, children: state.catalogStatus })] }), state.catalog.map(group => (_jsxs("div", { children: [_jsx("div", { style: muted, children: group.providerName }), group.rows.map(row => (_jsxs("label", { style: inline, children: [_jsx("input", { type: "checkbox", checked: row.selected, onChange: () => { toggle(row); } }), _jsx("span", { style: mono, children: row.model }), _jsx("span", { style: muted, children: row.available ? row.modelName : t('poolUnavailable') })] }, `${row.provider}/${row.model}`)))] }, group.provider)))] }));
}
/** Role presets: priority chains and routing rules. */
function RolesSection(props) {
    const { t, state } = props;
    const settings = state.draft;
    const mutateRoles = (change) => {
        props.edit(draft => ({ ...draft, roles: change(structuredClone(draft.roles)) }));
    };
    const mutateRole = (roleIndex, change) => {
        mutateRoles((roles) => {
            const role = roles[roleIndex];
            if (role === undefined)
                return roles;
            roles[roleIndex] = change(structuredClone(role));
            return roles;
        });
    };
    return (_jsxs("section", { style: section, "aria-labelledby": props.headingId + '-roles', children: [_jsx("h3", { id: props.headingId + '-roles', children: t('rolesTitle') }), _jsx("p", { style: muted, children: t('rolesHint') }), settings.roles.map((role, roleIndex) => (_jsxs("div", { style: row, children: [_jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('roleId'), _jsx("input", { style: field, value: role.id, onChange: event => { mutateRole(roleIndex, current => ({ ...current, id: event.target.value })); } })] }), _jsxs("label", { style: label, children: [t('roleLabel'), _jsx("input", { style: field, value: role.label, onChange: event => { mutateRole(roleIndex, current => ({ ...current, label: event.target.value })); } })] }), _jsx("button", { type: "button", onClick: () => { mutateRoles((roles) => roles.filter((_, index) => index !== roleIndex)); }, children: t('roleRemove') })] }), _jsxs("label", { style: label, children: [t('roleDescription'), _jsx("input", { style: field, value: role.description ?? '', onChange: event => { mutateRole(roleIndex, current => ({ ...current, description: event.target.value })); } })] }), _jsxs("div", { children: [_jsx("div", { style: muted, children: t('chainTitle') }), role.chain.length === 0 ? _jsx("div", { style: muted, children: t('chainEmpty') }) : null, role.chain.map((member, memberIndex) => (_jsxs("div", { style: inline, children: [_jsxs("span", { style: mono, children: [memberIndex + 1, ". ", member.provider, "/", member.model] }), _jsx("button", { type: "button", disabled: memberIndex === 0, onClick: () => { moveMember(props, roleIndex, memberIndex, -1); }, children: t('memberUp') }), _jsx("button", { type: "button", disabled: memberIndex === role.chain.length - 1, onClick: () => { moveMember(props, roleIndex, memberIndex, 1); }, children: t('memberDown') }), _jsx("button", { type: "button", onClick: () => { mutateRole(roleIndex, current => ({ ...current, chain: current.chain.filter((_, index) => index !== memberIndex) })); }, children: t('memberRemove') })] }, `${member.provider}/${member.model}`))), _jsxs("select", { value: "", onChange: event => {
                                    const member = memberFromKey(settings, event.target.value);
                                    if (member === undefined)
                                        return;
                                    mutateRole(roleIndex, current => ({ ...current, chain: [...current.chain, member] }));
                                }, children: [_jsx("option", { value: "", children: t('chainAdd') }), settings.pool
                                        .filter(entry => !role.chain.some(member => member.provider === entry.provider && member.model === entry.model))
                                        .map(entry => _jsxs("option", { value: `${entry.provider}\u0000${entry.model}`, children: [entry.provider, "/", entry.model] }, `${entry.provider}/${entry.model}`))] })] }), _jsxs("div", { children: [_jsxs("div", { style: muted, children: [t('rulesTitle'), " \u2014 ", t('rulesHint')] }), (role.rules ?? []).map((rule, ruleIndex) => (_jsxs("div", { style: row, children: [_jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('ruleKeywords'), _jsx("input", { style: field, value: (rule.when.promptAny ?? []).join(', '), onChange: event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, promptAny: splitList(event.target.value) } })); } })] }), _jsxs("label", { style: label, children: [t('ruleRegex'), _jsx("input", { style: field, value: rule.when.promptRegex ?? '', onChange: event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, promptRegex: event.target.value } })); } })] })] }), _jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('ruleModalities'), _jsx("input", { style: field, value: (rule.when.modalities ?? []).join(', '), onChange: event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, modalities: splitList(event.target.value) } })); } })] }), _jsxs("label", { style: label, children: [t('ruleContext'), _jsx("input", { style: field, type: "number", value: rule.when.minContextWindow ?? 0, onChange: event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, minContextWindow: Number(event.target.value) } })); } })] }), _jsxs("label", { style: label, children: [t('ruleTags'), _jsx("input", { style: field, value: (rule.when.capabilities ?? []).join(', '), onChange: event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, capabilities: splitList(event.target.value) } })); } })] })] }), _jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('ruleUse'), _jsx("select", { value: `${rule.use.provider}\u0000${rule.use.model}`, onChange: event => {
                                                            const member = memberFromKey(settings, event.target.value);
                                                            if (member === undefined)
                                                                return;
                                                            mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, use: member }));
                                                        }, children: role.chain.map(member => (_jsxs("option", { value: `${member.provider}\u0000${member.model}`, children: [member.provider, "/", member.model] }, `${member.provider}/${member.model}`))) })] }), _jsx("button", { type: "button", onClick: () => { mutateRole(roleIndex, current => ({ ...current, rules: (current.rules ?? []).filter((_, index) => index !== ruleIndex) })); }, children: t('ruleRemove') })] })] }, `rule-${ruleIndex}`))), _jsx("button", { type: "button", disabled: role.chain.length === 0, onClick: () => {
                                    mutateRole(roleIndex, current => ({
                                        ...current,
                                        rules: [...(current.rules ?? []), { when: { promptAny: [] }, use: current.chain[0] }],
                                    }));
                                }, children: t('ruleAdd') })] })] }, role.id))), _jsx("button", { type: "button", onClick: () => {
                    mutateRoles((roles) => {
                        const id = nextId(roles.map(role => role.id), 'role');
                        return [...roles, { id, label: id, chain: [] }];
                    });
                }, children: t('roleAdd') })] }));
}
/** The switches, the delegation wiring, and the AI routing stage. */
function SwitchSection(props) {
    const { t, state } = props;
    const settings = state.draft;
    const set = (change) => { props.edit(change); };
    const checkbox = (key, checked, onChange) => (_jsxs("label", { style: inline, children: [_jsx("input", { type: "checkbox", checked: checked, onChange: event => { onChange(event.target.checked); } }), _jsx("span", { children: t(key) })] }, key));
    return (_jsxs("section", { style: section, "aria-labelledby": props.headingId + '-switches', children: [_jsx("h3", { id: props.headingId + '-switches', children: t('switchesTitle') }), checkbox('switchesList', settings.exposure.listTool, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, listTool: next } })); }), checkbox('switchesSessionStart', settings.exposure.sessionStart, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, sessionStart: next } })); }), checkbox('switchesDelegate', settings.exposure.delegateTool, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, delegateTool: next } })); }), checkbox('switchesFallback', settings.routing.fallback, next => { set(draft => ({ ...draft, routing: { ...draft.routing, fallback: next } })); }), checkbox('switchesAi', settings.routing.aiEnabled, next => { set(draft => ({ ...draft, routing: { ...draft.routing, aiEnabled: next } })); }), _jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('switchesAiProvider'), _jsx("input", { style: field, value: settings.routing.aiProvider ?? '', onChange: event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiProvider: event.target.value } })); } })] }), _jsxs("label", { style: label, children: [t('switchesAiModel'), _jsx("input", { style: field, value: settings.routing.aiModel ?? '', onChange: event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiModel: event.target.value } })); } })] }), _jsxs("label", { style: label, children: [t('switchesAiTimeout'), _jsx("input", { style: field, type: "number", value: settings.routing.aiTimeoutMs, onChange: event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiTimeoutMs: Number(event.target.value) } })); } })] })] }), _jsx("div", { style: inline, children: BINDINGS.map(({ key, labelKey }) => (_jsxs("label", { style: label, children: [t(labelKey), _jsxs("select", { style: field, value: settings.bindings[key].kind === 'role' ? (settings.bindings[key].role ?? '') : '', onChange: event => {
                                set(draft => ({
                                    ...draft,
                                    bindings: {
                                        ...draft.bindings,
                                        [key]: event.target.value.length === 0
                                            ? { kind: 'off' }
                                            : { kind: 'role', role: event.target.value },
                                    },
                                }));
                            }, children: [_jsx("option", { value: "", children: t('bindingOff') }), settings.roles.map(role => (_jsx("option", { value: role.id, children: role.label || role.id }, role.id)))] })] }, key))) }), _jsxs("div", { style: inline, children: [_jsxs("label", { style: label, children: [t('delegateProvider'), _jsx("input", { style: field, value: settings.delegate.provider, onChange: event => { set(draft => ({ ...draft, delegate: { ...draft.delegate, provider: event.target.value } })); } })] }), _jsxs("label", { style: label, children: [t('delegateToolName'), _jsx("input", { style: field, value: settings.delegate.toolName, onChange: event => { set(draft => ({ ...draft, delegate: { ...draft.delegate, toolName: event.target.value } })); } })] })] })] }));
}
/** The bindable features, in the order the page lists them. */
const BINDINGS = [
    { key: 'compact', labelKey: 'bindingCompact' },
    { key: 'sessionTitle', labelKey: 'bindingSessionTitle' },
    { key: 'delegateDefault', labelKey: 'bindingDelegateDefault' },
];
/** Split one comma-separated control into trimmed, non-empty entries. */
function splitList(value) {
    return value.split(',').map(part => part.trim()).filter(part => part.length > 0);
}
/** Resolve a `provider\0model` option value against the live pool. */
function memberFromKey(settings, key) {
    const [provider, model] = key.split('\u0000');
    if (provider === undefined || model === undefined || provider.length === 0 || model.length === 0)
        return undefined;
    if (!settings.pool.some(entry => entry.provider === provider && entry.model === model))
        return undefined;
    return { provider, model };
}
/** The first free id with the requested stem. */
function nextId(existing, stem) {
    for (let index = 1;; index += 1) {
        const candidate = `${stem}-${index}`;
        if (!existing.includes(candidate))
            return candidate;
    }
}
/** Reorder one chain member. */
function moveMember(props, roleIndex, memberIndex, delta) {
    props.edit((draft) => {
        const roles = structuredClone(draft.roles);
        const role = roles[roleIndex];
        if (role === undefined)
            return draft;
        const chain = [...role.chain];
        const target = memberIndex + delta;
        const member = chain[memberIndex];
        const other = chain[target];
        if (member === undefined || other === undefined)
            return draft;
        chain[memberIndex] = other;
        chain[target] = member;
        role.chain = chain;
        return { ...draft, roles };
    });
}
/** Stage one rule edit. */
function mutateRule(props, roleIndex, ruleIndex, change) {
    props.edit((draft) => {
        const roles = structuredClone(draft.roles);
        const role = roles[roleIndex];
        const rule = role?.rules?.[ruleIndex];
        if (role === undefined || rule === undefined)
            return draft;
        const rules = [...(role.rules ?? [])];
        rules[ruleIndex] = change(rule);
        role.rules = rules;
        return { ...draft, roles };
    });
}
//# sourceMappingURL=RoleConfigPage.js.map