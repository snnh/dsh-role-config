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

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ModelProviderGroup } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsFormScope, SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  Bindings,
  DelegateConfig,
  Exposure,
  PoolModel,
  Role,
  RoleConfigSettings,
  RoleGroup,
  RouteCondition,
  RouteMember,
  RouteRule,
  Routing,
} from '../settings.ts'
import { inspectRoleConfig } from '../settings.ts'
import type { RoleConfigProblem } from '../settings.ts'

/** Settings namespace this page edits (the Loader row id). */
export const ROLE_CONFIG_NS = 'role-config'

/** One catalog row joined with the pool. */
export interface CatalogRow {
  readonly provider: string
  readonly providerName: string
  readonly model: string
  readonly modelName: string
  /** Whether the current adapter catalog still advertises this route. */
  readonly available: boolean
  /** Whether the draft holds it. */
  readonly selected: boolean
}

/** One provider group of the pool picker. */
export interface CatalogGroup {
  readonly provider: string
  readonly providerName: string
  readonly rows: readonly CatalogRow[]
}

/** The snapshot the page renders. */
export interface RoleConfigPageState extends SettingsFormShell {
  /** Staged settings, or the stored value when nothing is staged. */
  readonly draft: RoleConfigSettings
  /** Whether the draft differs from the stored value. */
  readonly dirty: boolean
  /** Validation findings for the draft. */
  readonly problems: readonly RoleConfigProblem[]
  /** Catalog status of the adapter directory. */
  readonly catalogStatus: 'idle' | 'loading' | 'ready' | 'error'
  /** Whether any provider-local catalog request failed. */
  readonly catalogPartial: boolean
  /** Provider groups of the picker: catalog rows plus retained unknown routes. */
  readonly catalog: readonly CatalogGroup[]
  /** Whether a newer Host revision invalidated the draft. */
  readonly conflicted: boolean
}

/** Actions and hooks the page binds. */
export interface RoleConfigPageFace {
  hooks: {
    /** Page snapshot bound by the renderer as useRoleConfigPage. */
    roleConfigPage: SnapshotStore<RoleConfigPageState>
  }
  /** Load (or reload) the adapter catalog. */
  retryCatalog: () => void
  /** Stage a whole draft. */
  edit: (update: (draft: RoleConfigSettings) => RoleConfigSettings) => void
  /** Persist the staged draft. */
  save: () => void
  /** Drop the staged draft. */
  discard: () => void
}

/** The page's empty settings value, used before the first read lands. */
const EMPTY: RoleConfigSettings = {
  pool: [],
  groups: [],
  bindings: { compact: { kind: 'off' }, sessionTitle: { kind: 'off' }, delegateDefault: { kind: 'off' } },
  exposure: { listTool: true, sessionStart: false, delegateTool: true },
  routing: { fallback: true, aiEnabled: false, aiTimeoutMs: 8000 },
  delegate: { provider: 'spawn', toolName: 'subagent', enableRunInBackground: true },
}

/** Structural equality good enough for a settings document (plain JSON). */
function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** Clone one settings document. */
function cloneSettings(settings: RoleConfigSettings): RoleConfigSettings {
  return structuredClone(settings)
}

/** Whether one route still has an entry in the pool. */
export function poolHas(settings: RoleConfigSettings, route: RouteMember): boolean {
  return settings.pool.some(entry => entry.provider === route.provider && entry.model === route.model)
}

/** Bridges the settings namespace, the adapter directory, and one staged draft. */
export class RoleConfigPageController {
  private draft: RoleConfigSettings | undefined
  private draftRevision: number | undefined
  private catalogGroups: readonly ModelProviderGroup[] = []
  private catalogStatus: RoleConfigPageState['catalogStatus'] = 'idle'
  private catalogPartial = false
  private saving = false
  private conflicted = false
  private disposed = false
  private saveGeneration = 0
  private catalogGeneration = 0
  private readonly store: SnapshotStore<RoleConfigPageState>
  private readonly unsubscribe: () => void

  /**
   * @param scope - the bound `role-config` settings form.
   * @param ctx - the page plugin's context, whose `remote.session` namespace
   * answers the Host model catalog.
   */
  constructor(
    private readonly scope: SettingsFormScope<RoleConfigSettings>,
    private readonly ctx: ClientContext,
  ) {
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = scope.subscribe(() => {
      const snapshot = this.scope.getSnapshot()
      if (!this.saving && this.draft !== undefined && snapshot.revision !== this.draftRevision) {
        if (snapshot.value !== undefined && sameValue(snapshot.value, this.draft)) {
          this.draft = undefined
          this.draftRevision = undefined
          this.conflicted = false
        } else {
          this.conflicted = true
        }
      }
      this.publish()
    })
    void this.loadCatalog()
  }

  /** Stop observing settings and suppress late settlements. */
  dispose(): void {
    this.disposed = true
    this.saveGeneration += 1
    this.catalogGeneration += 1
    this.unsubscribe()
  }

  /** The renderer face for this page. */
  inject(): RoleConfigPageFace {
    return {
      hooks: { roleConfigPage: this.store },
      retryCatalog: () => { void this.loadCatalog() },
      edit: (update) => { this.edit(update) },
      save: () => { void this.save() },
      discard: () => { this.discard() },
    }
  }

  /** Load the adapter catalog once per request, keeping the last good one. */
  async loadCatalog(): Promise<void> {
    if (this.disposed) return
    const generation = ++this.catalogGeneration
    this.catalogStatus = 'loading'
    this.publish()
    try {
      const response = await this.ctx.remote.session.modelCatalog()
      if (this.disposed || generation !== this.catalogGeneration) return
      if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`)
      this.catalogGroups = response.value.groups
      this.catalogPartial = response.value.groups.some(group => (group as { error?: unknown }).error !== undefined)
      this.catalogStatus = 'ready'
    } catch {
      if (this.disposed || generation !== this.catalogGeneration) return
      this.catalogStatus = 'error'
    }
    this.publish()
  }

  private current(): RoleConfigSettings {
    return this.scope.getSnapshot().value ?? EMPTY
  }

  private staged(): RoleConfigSettings {
    this.draft ??= cloneSettings(this.current())
    this.draftRevision ??= this.scope.getSnapshot().revision
    return this.draft
  }

  private edit(update: (draft: RoleConfigSettings) => RoleConfigSettings): void {
    const snapshot = this.scope.getSnapshot()
    if (this.disposed || !snapshot.writable || this.saving) return
    this.draft = update(cloneSettings(this.staged()))
    this.publish()
  }

  private discard(): void {
    if (this.saving) return
    this.draft = undefined
    this.draftRevision = undefined
    this.conflicted = false
    this.publish()
  }

  private async save(): Promise<void> {
    const snapshot = this.scope.getSnapshot()
    if (this.disposed || this.draft === undefined || !snapshot.writable || this.saving) return
    if (this.conflicted) return
    const desired = this.draft
    if (snapshot.revision !== this.draftRevision) {
      this.conflicted = true
      this.publish()
      return
    }
    const generation = ++this.saveGeneration
    this.saving = true
    this.publish()
    const ops = (['pool', 'groups', 'bindings', 'exposure', 'routing', 'delegate'] as const)
      .map(field => ({ op: 'set' as const, path: [field], value: desired[field] as never }))
    try {
      const ok = await this.scope.mutate(ops, this.draftRevision)
      if (this.disposed || generation !== this.saveGeneration) return
      if (ok) {
        this.draft = undefined
        this.draftRevision = undefined
      }
    } finally {
      if (!this.disposed && generation === this.saveGeneration) {
        this.saving = false
        this.publish()
      }
    }
  }

  /** Build the picker: catalog rows plus pool routes the adapter dropped. */
  private catalog(): CatalogGroup[] {
    const settings = this.staged()
    const selected = new Set(settings.pool.map(entry => `${entry.provider}\u0000${entry.model}`))
    const groups: CatalogGroup[] = this.catalogGroups.map(group => ({
      provider: group.id,
      providerName: group.name,
      rows: group.models.map(model => ({
        provider: group.id,
        providerName: group.name,
        model: model.id,
        modelName: model.name,
        available: true,
        selected: selected.has(`${group.id}\u0000${model.id}`),
      })),
    }))
    const known = new Set(groups.flatMap(group => group.rows.map(row => `${row.provider}\u0000${row.model}`)))
    const kept = settings.pool
      .filter(entry => !known.has(`${entry.provider}\u0000${entry.model}`))
      .map((entry): CatalogRow => ({
        provider: entry.provider,
        providerName: entry.provider,
        model: entry.model,
        modelName: entry.model,
        available: false,
        selected: true,
      }))
    if (kept.length > 0) {
      groups.push({ provider: '(unavailable)', providerName: 'unavailable', rows: kept })
    }
    return groups
  }

  private projection(): RoleConfigPageState {
    const snapshot = this.scope.getSnapshot()
    const draft = this.draft ?? snapshot.value ?? EMPTY
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      saving: this.saving,
      failed: false,
      dirty: this.draft !== undefined && !sameValue(this.draft, snapshot.value),
      invalid: inspectRoleConfig(draft).length > 0,
      draft,
      problems: inspectRoleConfig(draft),
      catalogStatus: this.catalogStatus,
      catalogPartial: this.catalogPartial,
      catalog: this.catalog(),
      conflicted: this.conflicted,
    }
  }

  private publish(): void {
    if (this.disposed) return
    this.store.update((state) => {
      Object.assign(state, this.projection())
    })
  }
}

/** Convenience: one pool entry for a catalog row. */
export function poolEntryFor(provider: string, model: string, description = ''): PoolModel {
  return { provider, model, description }
}

/** Convenience: the settings fields the page edits, in save order. */
export type { Bindings, DelegateConfig, Exposure, Role, RoleGroup, RouteCondition, RouteMember, RouteRule, Routing }
