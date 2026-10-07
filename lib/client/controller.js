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
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { inspectRoleConfig } from "../settings.js";
/** Settings namespace this page edits (the Loader row id). */
export const ROLE_CONFIG_NS = 'role-config';
/** The page's empty settings value, used before the first read lands. */
const EMPTY = {
    pool: [],
    groups: [],
    bindings: { compact: { kind: 'off' }, sessionTitle: { kind: 'off' }, delegateDefault: { kind: 'off' } },
    exposure: { listTool: true, sessionStart: false, delegateTool: true },
    routing: { fallback: true, aiEnabled: false, aiTimeoutMs: 8000 },
    delegate: { provider: 'spawn', toolName: 'subagent', enableRunInBackground: true },
};
/** Structural equality good enough for a settings document (plain JSON). */
function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}
/** Clone one settings document. */
function cloneSettings(settings) {
    return structuredClone(settings);
}
/** Whether one route still has an entry in the pool. */
export function poolHas(settings, route) {
    return settings.pool.some(entry => entry.provider === route.provider && entry.model === route.model);
}
/** Bridges the settings namespace, the adapter directory, and one staged draft. */
export class RoleConfigPageController {
    scope;
    ctx;
    draft;
    draftRevision;
    catalogGroups = [];
    catalogStatus = 'idle';
    catalogPartial = false;
    saving = false;
    conflicted = false;
    disposed = false;
    saveGeneration = 0;
    catalogGeneration = 0;
    store;
    unsubscribe;
    /**
     * @param scope - the bound `role-config` settings form.
     * @param ctx - the page plugin's context, whose `remote.session` namespace
     * answers the Host model catalog.
     */
    constructor(scope, ctx) {
        this.scope = scope;
        this.ctx = ctx;
        this.store = createSnapshotStore(this.projection());
        this.unsubscribe = scope.subscribe(() => {
            const snapshot = this.scope.getSnapshot();
            if (!this.saving && this.draft !== undefined && snapshot.revision !== this.draftRevision) {
                if (snapshot.value !== undefined && sameValue(snapshot.value, this.draft)) {
                    this.draft = undefined;
                    this.draftRevision = undefined;
                    this.conflicted = false;
                }
                else {
                    this.conflicted = true;
                }
            }
            this.publish();
        });
        void this.loadCatalog();
    }
    /** Stop observing settings and suppress late settlements. */
    dispose() {
        this.disposed = true;
        this.saveGeneration += 1;
        this.catalogGeneration += 1;
        this.unsubscribe();
    }
    /** The renderer face for this page. */
    inject() {
        return {
            hooks: { roleConfigPage: this.store },
            retryCatalog: () => { void this.loadCatalog(); },
            edit: (update) => { this.edit(update); },
            save: () => { void this.save(); },
            discard: () => { this.discard(); },
        };
    }
    /** Load the adapter catalog once per request, keeping the last good one. */
    async loadCatalog() {
        if (this.disposed)
            return;
        const generation = ++this.catalogGeneration;
        this.catalogStatus = 'loading';
        this.publish();
        try {
            const response = await this.ctx.remote.session.modelCatalog();
            if (this.disposed || generation !== this.catalogGeneration)
                return;
            if (!response.ok)
                throw new Error(`${response.error.code}: ${response.error.message}`);
            this.catalogGroups = response.value.groups;
            this.catalogPartial = response.value.groups.some(group => group.error !== undefined);
            this.catalogStatus = 'ready';
        }
        catch {
            if (this.disposed || generation !== this.catalogGeneration)
                return;
            this.catalogStatus = 'error';
        }
        this.publish();
    }
    current() {
        return this.scope.getSnapshot().value ?? EMPTY;
    }
    staged() {
        this.draft ??= cloneSettings(this.current());
        this.draftRevision ??= this.scope.getSnapshot().revision;
        return this.draft;
    }
    edit(update) {
        const snapshot = this.scope.getSnapshot();
        if (this.disposed || !snapshot.writable || this.saving)
            return;
        // Staging needs a value to stage over: seeding from a form that has not
        // loaded yet would freeze the page on a draft the Host never sent.
        if (snapshot.value === undefined)
            return;
        this.draft = update(cloneSettings(this.staged()));
        this.publish();
    }
    discard() {
        if (this.saving)
            return;
        this.draft = undefined;
        this.draftRevision = undefined;
        this.conflicted = false;
        this.publish();
    }
    async save() {
        const snapshot = this.scope.getSnapshot();
        if (this.disposed || this.draft === undefined || !snapshot.writable || this.saving)
            return;
        if (this.conflicted)
            return;
        const desired = this.draft;
        if (snapshot.revision !== this.draftRevision) {
            this.conflicted = true;
            this.publish();
            return;
        }
        const generation = ++this.saveGeneration;
        this.saving = true;
        this.publish();
        const ops = ['pool', 'groups', 'bindings', 'exposure', 'routing', 'delegate']
            .map(field => ({ op: 'set', path: [field], value: desired[field] }));
        try {
            const ok = await this.scope.mutate(ops, this.draftRevision);
            if (this.disposed || generation !== this.saveGeneration)
                return;
            if (ok) {
                this.draft = undefined;
                this.draftRevision = undefined;
            }
        }
        finally {
            if (!this.disposed && generation === this.saveGeneration) {
                this.saving = false;
                this.publish();
            }
        }
    }
    /** Build the picker: catalog rows plus pool routes the adapter dropped. */
    catalog() {
        // A read must never seed the draft: the picker is built from inside the
        // constructor's first projection, before the Host's value arrives, and a
        // draft seeded from that empty gap outranks the stored settings for the
        // page's whole lifetime — the page then renders an empty pool and a save
        // writes that empty draft over the stored one.
        const settings = this.draft ?? this.current();
        const selected = new Set(settings.pool.map(entry => `${entry.provider}\u0000${entry.model}`));
        const groups = this.catalogGroups.map(group => ({
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
        }));
        const known = new Set(groups.flatMap(group => group.rows.map(row => `${row.provider}\u0000${row.model}`)));
        const kept = settings.pool
            .filter(entry => !known.has(`${entry.provider}\u0000${entry.model}`))
            .map((entry) => ({
            provider: entry.provider,
            providerName: entry.provider,
            model: entry.model,
            modelName: entry.model,
            available: false,
            selected: true,
        }));
        if (kept.length > 0) {
            groups.push({ provider: '(unavailable)', providerName: 'unavailable', rows: kept });
        }
        return groups;
    }
    projection() {
        const snapshot = this.scope.getSnapshot();
        const draft = this.draft ?? snapshot.value ?? EMPTY;
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
        };
    }
    publish() {
        if (this.disposed)
            return;
        this.store.update((state) => {
            Object.assign(state, this.projection());
        });
    }
}
/** Convenience: one pool entry for a catalog row. */
export function poolEntryFor(provider, model, description = '') {
    return { provider, model, description };
}
//# sourceMappingURL=controller.js.map