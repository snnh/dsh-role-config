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

import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { SettingsForm } from '@deepseek-ai/dsh-client-ui-primitives'
import type { RoleConfigPageFace, RoleConfigPageState, CatalogRow } from './controller.ts'
import { poolHas } from './controller.ts'
import type { RoleConfigKey } from './locales.ts'
import type { PoolModel, RoleConfigSettings, RouteMember, RouteRule } from '../settings.ts'

/**
 * Draft-shaped mirrors of the settings types: the page edits mutable clones,
 * while the shared vocabulary keeps its readonly contract.
 */
interface DraftRole {
  id: string
  label: string
  description?: string
  chain: RouteMember[]
  rules?: RouteRule[]
}
/** Props the Plugins page injects into this page. */
export type RoleConfigPageProps = PropsRuntime<'plugins.item'>
  & PropsLocale<'settings.role-config'>
  & InjectFace<RoleConfigPageFace>

const label: CSSProperties = { display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 2 }
const field: CSSProperties = { width: '100%', boxSizing: 'border-box' }
const section: CSSProperties = { display: 'grid', gap: 10, marginBottom: 22 }
const row: CSSProperties = { display: 'grid', gap: 8, padding: '8px 0', borderTop: '1px solid rgba(127,127,127,0.2)' }
const inline: CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
const muted: CSSProperties = { fontSize: 12, opacity: 0.7 }
const mono: CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 12 }

/**
 * Render the Role Config settings form.
 * @param props - locale copy, the page snapshot, and its actions.
 * @returns the summary line or the editable form.
 */
export function RoleConfigPage(props: RoleConfigPageProps) {
  const { t } = props
  const state = props.useRoleConfigPage(snapshot => snapshot)
  const headingId = useId()
  if (props.view === 'summary') return t('description')
  return (
    <SettingsForm
      labels={{
        unavailable: t('unavailable'),
        readOnly: t('notWritable'),
        saveFailed: t('conflict'),
        save: t('save'),
        saving: t('saving'),
      }}
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <p style={muted}>{t('description')}</p>
      <PoolSection t={t} state={state} edit={props.edit} retryCatalog={props.retryCatalog} headingId={headingId} />
      <RolesSection t={t} state={state} edit={props.edit} headingId={headingId} />
      <SwitchSection t={t} state={state} edit={props.edit} headingId={headingId} />
      {state.problems.length > 0
        ? (
          <section aria-labelledby={`${headingId}-problems`}>
            <h3 id={`${headingId}-problems`}>{t('problemTitle')}</h3>
            <ul>{state.problems.map(problem => <li key={`${problem.path}:${problem.message}`} style={muted}>{problem.path}: {problem.message}</li>)}</ul>
          </section>
        )
        : null}
    </SettingsForm>
  )
}

type Copy = (key: RoleConfigKey) => string
type Edit = RoleConfigPageFace['edit']

/** The pool picker, the pool rows, and the descriptions the model reads. */
function PoolSection(props: { t: Copy; state: RoleConfigPageState; edit: Edit; retryCatalog: () => void; headingId: string }) {
  const { t, state } = props
  const settings = state.draft
  const toggle = (row: CatalogRow): void => {
    props.edit((draft) => {
      const exists = draft.pool.some(entry => entry.provider === row.provider && entry.model === row.model)
      return {
        ...draft,
        pool: exists
          ? draft.pool.filter(entry => !(entry.provider === row.provider && entry.model === row.model))
          : [...draft.pool, { provider: row.provider, model: row.model, description: '' }],
      }
    })
  }
  const update = (index: number, patch: Partial<PoolModel>): void => {
    props.edit((draft) => ({
      ...draft,
      pool: draft.pool.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)),
    }))
  }
  return (
    <section style={section} aria-labelledby={props.headingId + '-pool'}>
      <h3 id={props.headingId + '-pool'}>{t('poolTitle')}</h3>
      <p style={muted}>{t('poolHint')}</p>
      {settings.pool.length === 0 ? <p style={muted}>{t('poolEmpty')}</p> : null}
      {settings.pool.map((entry, index) => (
        <div key={`${entry.provider}/${entry.model}`} style={row}>
          <div style={inline}>
            <span style={mono}>{entry.provider}/{entry.model}</span>
            {!poolHas(settings, entry) || state.catalog.some(group => group.rows.some(r => r.provider === entry.provider && r.model === entry.model && !r.available))
              ? <span style={muted}>{t('poolUnavailable')}</span>
              : null}
            <button type="button" onClick={() => { toggle({ provider: entry.provider, model: entry.model, selected: true, available: true, providerName: entry.provider, modelName: entry.model }) }}>
              {t('poolRemove')}
            </button>
          </div>
          <label style={label}>{t('poolLabel')}
            <input
              style={field}
              value={entry.label ?? ''}
              onChange={event => { update(index, { label: event.target.value }) }}
            />
          </label>
          <label style={label}>{t('poolDescription')}
            <textarea
              style={field}
              rows={2}
              value={entry.description}
              onChange={event => { update(index, { description: event.target.value }) }}
            />
          </label>
          <label style={label}>{t('poolCapabilities')}
            <input
              style={field}
              placeholder={t('poolCapabilitiesHint')}
              value={(entry.capabilities ?? []).join(', ')}
              onChange={event => { update(index, { capabilities: splitList(event.target.value) }) }}
            />
          </label>
        </div>
      ))}
      <div style={inline}>
        <strong style={muted}>{t('poolAdd')}</strong>
        <button type="button" onClick={props.retryCatalog}>{t('poolRetry')}</button>
        <span style={muted}>{state.catalogStatus}</span>
      </div>
      {state.catalog.map(group => (
        <div key={group.provider}>
          <div style={muted}>{group.providerName}</div>
          {group.rows.map(row => (
            <label key={`${row.provider}/${row.model}`} style={inline}>
              <input type="checkbox" checked={row.selected} onChange={() => { toggle(row) }} />
              <span style={mono}>{row.model}</span>
              <span style={muted}>{row.available ? row.modelName : t('poolUnavailable')}</span>
            </label>
          ))}
        </div>
      ))}
    </section>
  )
}

/** Role presets: priority chains and routing rules. */
function RolesSection(props: { t: Copy; state: RoleConfigPageState; edit: Edit; headingId: string }) {
  const { t, state } = props
  const settings = state.draft
  const mutateRoles = (change: (roles: DraftRole[]) => DraftRole[]): void => {
    props.edit(draft => ({ ...draft, roles: change(structuredClone(draft.roles) as DraftRole[]) }))
  }
  const mutateRole = (roleIndex: number, change: (role: DraftRole) => DraftRole): void => {
    mutateRoles((roles) => {
      const role = roles[roleIndex]
      if (role === undefined) return roles
      roles[roleIndex] = change(structuredClone(role))
      return roles
    })
  }
  return (
    <section style={section} aria-labelledby={props.headingId + '-roles'}>
      <h3 id={props.headingId + '-roles'}>{t('rolesTitle')}</h3>
      <p style={muted}>{t('rolesHint')}</p>
      {settings.roles.map((role, roleIndex) => (
          <div key={role.id} style={row}>
            <div style={inline}>
              <label style={label}>{t('roleId')}
                <input
                  style={field}
                  value={role.id}
                  onChange={event => { mutateRole(roleIndex, current => ({ ...current, id: event.target.value })) }}
                />
              </label>
              <label style={label}>{t('roleLabel')}
                <input
                  style={field}
                  value={role.label}
                  onChange={event => { mutateRole(roleIndex, current => ({ ...current, label: event.target.value })) }}
                />
              </label>
              <button type="button" onClick={() => { mutateRoles((roles) => roles.filter((_, index) => index !== roleIndex)) }}>
                {t('roleRemove')}
              </button>
            </div>
            <label style={label}>{t('roleDescription')}
              <input
                style={field}
                value={role.description ?? ''}
                onChange={event => { mutateRole(roleIndex, current => ({ ...current, description: event.target.value })) }}
              />
            </label>
            <div>
              <div style={muted}>{t('chainTitle')}</div>
              {role.chain.length === 0 ? <div style={muted}>{t('chainEmpty')}</div> : null}
              {role.chain.map((member, memberIndex) => (
                <div key={`${member.provider}/${member.model}`} style={inline}>
                  <span style={mono}>{memberIndex + 1}. {member.provider}/{member.model}</span>
                  <button type="button" disabled={memberIndex === 0} onClick={() => { moveMember(props, roleIndex, memberIndex, -1) }}>{t('memberUp')}</button>
                  <button type="button" disabled={memberIndex === role.chain.length - 1} onClick={() => { moveMember(props, roleIndex, memberIndex, 1) }}>{t('memberDown')}</button>
                  <button type="button" onClick={() => { mutateRole(roleIndex, current => ({ ...current, chain: current.chain.filter((_, index) => index !== memberIndex) })) }}>{t('memberRemove')}</button>
                </div>
              ))}
              <select
                value=""
                onChange={event => {
                  const member = memberFromKey(settings, event.target.value)
                  if (member === undefined) return
                  mutateRole(roleIndex, current => ({ ...current, chain: [...current.chain, member] }))
                }}
              >
                <option value="">{t('chainAdd')}</option>
                {settings.pool
                  .filter(entry => !role.chain.some(member => member.provider === entry.provider && member.model === entry.model))
                  .map(entry => <option key={`${entry.provider}/${entry.model}`} value={`${entry.provider}\u0000${entry.model}`}>{entry.provider}/{entry.model}</option>)}
              </select>
            </div>
            <div>
              <div style={muted}>{t('rulesTitle')} — {t('rulesHint')}</div>
              {(role.rules ?? []).map((rule, ruleIndex) => (
                <div key={`rule-${ruleIndex}`} style={row}>
                  <div style={inline}>
                    <label style={label}>{t('ruleKeywords')}
                      <input
                        style={field}
                        value={(rule.when.promptAny ?? []).join(', ')}
                        onChange={event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, promptAny: splitList(event.target.value) } })) }}
                      />
                    </label>
                    <label style={label}>{t('ruleRegex')}
                      <input
                        style={field}
                        value={rule.when.promptRegex ?? ''}
                        onChange={event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, promptRegex: event.target.value } })) }}
                      />
                    </label>
                  </div>
                  <div style={inline}>
                    <label style={label}>{t('ruleModalities')}
                      <input
                        style={field}
                        value={(rule.when.modalities ?? []).join(', ')}
                        onChange={event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, modalities: splitList(event.target.value) } })) }}
                      />
                    </label>
                    <label style={label}>{t('ruleContext')}
                      <input
                        style={field}
                        type="number"
                        value={rule.when.minContextWindow ?? 0}
                        onChange={event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, minContextWindow: Number(event.target.value) } })) }}
                      />
                    </label>
                    <label style={label}>{t('ruleTags')}
                      <input
                        style={field}
                        value={(rule.when.capabilities ?? []).join(', ')}
                        onChange={event => { mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, when: { ...current.when, capabilities: splitList(event.target.value) } })) }}
                      />
                    </label>
                  </div>
                  <div style={inline}>
                    <label style={label}>{t('ruleUse')}
                      <select
                        value={`${rule.use.provider}\u0000${rule.use.model}`}
                        onChange={event => {
                          const member = memberFromKey(settings, event.target.value)
                          if (member === undefined) return
                          mutateRule(props, roleIndex, ruleIndex, current => ({ ...current, use: member }))
                        }}
                      >
                        {role.chain.map(member => (
                          <option key={`${member.provider}/${member.model}`} value={`${member.provider}\u0000${member.model}`}>
                            {member.provider}/{member.model}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={() => { mutateRole(roleIndex, current => ({ ...current, rules: (current.rules ?? []).filter((_, index) => index !== ruleIndex) })) }}>
                      {t('ruleRemove')}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={role.chain.length === 0}
                onClick={() => { mutateRole(roleIndex, current => ({
                  ...current,
                  rules: [...(current.rules ?? []), { when: { promptAny: [] }, use: current.chain[0] as RouteMember }],
                })) }}
              >
                {t('ruleAdd')}
              </button>
            </div>
        </div>
      ))}
      <button type="button" onClick={() => { mutateRoles((roles) => {
        const id = nextId(roles.map(role => role.id), 'role')
        return [...roles, { id, label: id, chain: [] }]
      }) }}>
        {t('roleAdd')}
      </button>
    </section>
  )
}

/** The switches, the delegation wiring, and the AI routing stage. */
function SwitchSection(props: { t: Copy; state: RoleConfigPageState; edit: Edit; headingId: string }) {
  const { t, state } = props
  const settings: RoleConfigSettings = state.draft
  const set = (change: (draft: RoleConfigSettings) => RoleConfigSettings): void => { props.edit(change) }
  const checkbox = (
    key: RoleConfigKey,
    checked: boolean,
    onChange: (next: boolean) => void,
  ) => (
    <label style={inline} key={key}>
      <input type="checkbox" checked={checked} onChange={event => { onChange(event.target.checked) }} />
      <span>{t(key)}</span>
    </label>
  )
  return (
    <section style={section} aria-labelledby={props.headingId + '-switches'}>
      <h3 id={props.headingId + '-switches'}>{t('switchesTitle')}</h3>
      {checkbox('switchesList', settings.exposure.listTool, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, listTool: next } })) })}
      {checkbox('switchesSessionStart', settings.exposure.sessionStart, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, sessionStart: next } })) })}
      {checkbox('switchesDelegate', settings.exposure.delegateTool, next => { set(draft => ({ ...draft, exposure: { ...draft.exposure, delegateTool: next } })) })}
      {checkbox('switchesFallback', settings.routing.fallback, next => { set(draft => ({ ...draft, routing: { ...draft.routing, fallback: next } })) })}
      {checkbox('switchesAi', settings.routing.aiEnabled, next => { set(draft => ({ ...draft, routing: { ...draft.routing, aiEnabled: next } })) })}
      <div style={inline}>
        <label style={label}>{t('switchesAiProvider')}
          <input
            style={field}
            value={settings.routing.aiProvider ?? ''}
            onChange={event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiProvider: event.target.value } })) }}
          />
        </label>
        <label style={label}>{t('switchesAiModel')}
          <input
            style={field}
            value={settings.routing.aiModel ?? ''}
            onChange={event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiModel: event.target.value } })) }}
          />
        </label>
        <label style={label}>{t('switchesAiTimeout')}
          <input
            style={field}
            type="number"
            value={settings.routing.aiTimeoutMs}
            onChange={event => { set(draft => ({ ...draft, routing: { ...draft.routing, aiTimeoutMs: Number(event.target.value) } })) }}
          />
        </label>
      </div>
      <div style={inline}>
        {BINDINGS.map(({ key, labelKey }) => (
          <label style={label} key={key}>
            {t(labelKey)}
            <select
              style={field}
              value={settings.bindings[key].kind === 'role' ? (settings.bindings[key].role ?? '') : ''}
              onChange={event => { set(draft => ({
                ...draft,
                bindings: {
                  ...draft.bindings,
                  [key]: event.target.value.length === 0
                    ? { kind: 'off' as const }
                    : { kind: 'role' as const, role: event.target.value },
                },
              })) }}
            >
              <option value="">{t('bindingOff')}</option>
              {settings.roles.map(role => (
                <option key={role.id} value={role.id}>{role.label || role.id}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div style={inline}>
        <label style={label}>{t('delegateProvider')}
          <input
            style={field}
            value={settings.delegate.provider}
            onChange={event => { set(draft => ({ ...draft, delegate: { ...draft.delegate, provider: event.target.value } })) }}
          />
        </label>
        <label style={label}>{t('delegateToolName')}
          <input
            style={field}
            value={settings.delegate.toolName}
            onChange={event => { set(draft => ({ ...draft, delegate: { ...draft.delegate, toolName: event.target.value } })) }}
          />
        </label>
      </div>
    </section>
  )
}

/** The bindable features, in the order the page lists them. */
const BINDINGS: readonly { key: 'compact' | 'sessionTitle' | 'delegateDefault'; labelKey: RoleConfigKey }[] = [
  { key: 'compact', labelKey: 'bindingCompact' },
  { key: 'sessionTitle', labelKey: 'bindingSessionTitle' },
  { key: 'delegateDefault', labelKey: 'bindingDelegateDefault' },
]

/** Split one comma-separated control into trimmed, non-empty entries. */
function splitList(value: string): string[] {
  return value.split(',').map(part => part.trim()).filter(part => part.length > 0)
}

/** Resolve a `provider\0model` option value against the live pool. */
function memberFromKey(settings: RoleConfigSettings, key: string): RouteMember | undefined {
  const [provider, model] = key.split('\u0000')
  if (provider === undefined || model === undefined || provider.length === 0 || model.length === 0) return undefined
  if (!settings.pool.some(entry => entry.provider === provider && entry.model === model)) return undefined
  return { provider, model }
}

/** The first free id with the requested stem. */
function nextId(existing: readonly string[], stem: string): string {
  for (let index = 1; ; index += 1) {
    const candidate = `${stem}-${index}`
    if (!existing.includes(candidate)) return candidate
  }
}

/** Reorder one chain member. */
function moveMember(
  props: { t: Copy; state: RoleConfigPageState; edit: Edit },
  roleIndex: number,
  memberIndex: number,
  delta: number,
): void {
  props.edit((draft) => {
    const roles = structuredClone(draft.roles) as DraftRole[]
    const role = roles[roleIndex]
    if (role === undefined) return draft
    const chain = [...role.chain]
    const target = memberIndex + delta
    const member = chain[memberIndex]
    const other = chain[target]
    if (member === undefined || other === undefined) return draft
    chain[memberIndex] = other
    chain[target] = member
    role.chain = chain
    return { ...draft, roles }
  })
}

/** Stage one rule edit. */
function mutateRule(
  props: { t: Copy; state: RoleConfigPageState; edit: Edit },
  roleIndex: number,
  ruleIndex: number,
  change: (rule: RouteRule) => RouteRule,
): void {
  props.edit((draft) => {
    const roles = structuredClone(draft.roles) as DraftRole[]
    const role = roles[roleIndex]
    const rule = role?.rules?.[ruleIndex]
    if (role === undefined || rule === undefined) return draft
    const rules = [...(role.rules ?? [])]
    rules[ruleIndex] = change(rule)
    role.rules = rules
    return { ...draft, roles }
  })
}
