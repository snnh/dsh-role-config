/**
 * The page controller's staging rules: a read never seeds the draft, and an
 * edit never stages over a form that has not loaded.
 *
 * Both are the same defect seen from two sides. The picker is built from
 * inside the constructor's first projection, so a `catalog()` that staged
 * would freeze the page on an empty draft taken from the gap before the
 * Host's value arrives: the page renders "no models in the pool" forever and
 * a save writes that empty draft over the stored settings.
 */

import { describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SettingsFormScope, SettingsFormScopeSnapshot } from '@deepseek-ai/dsh-client-ui-primitives'
import { RoleConfigPageController } from '../src/client/controller.ts'
import type { RoleConfigSettings } from '../src/settings.ts'
import { plainSettings } from './fixtures.ts'

const STORED = plainSettings({
  pool: [
    { provider: 'deepseek', model: 'deepseek-chat', label: 'Chat', description: 'cheap and quick' },
    { provider: 'nextapi', model: 'k3-256k', description: '能力尚可的廉价模型' },
  ],
})

/** A settings form that starts unloaded and is delivered a value later. */
function fakeScope(writable = true): {
  scope: SettingsFormScope<RoleConfigSettings>
  deliver: (value: RoleConfigSettings, revision?: number) => void
  writes: number
} {
  const listeners = new Set<() => void>()
  const state = {
    writes: 0,
    snapshot: {
      status: 'loading', value: undefined, base: undefined, user: undefined, writable, revision: undefined,
    } as SettingsFormScopeSnapshot<RoleConfigSettings>,
  }
  return {
    get writes() { return state.writes },
    scope: {
      getSnapshot: () => state.snapshot,
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
      mutate: () => { state.writes += 1; return Promise.resolve(true) },
    },
    deliver: (value, revision = 0) => {
      state.snapshot = { ...state.snapshot, status: 'ready', value, revision }
      for (const listener of listeners) listener()
    },
  }
}

function hostContext(): ClientContext {
  return {
    remote: { session: { modelCatalog: () => Promise.resolve({ ok: true, value: { groups: [] } }) } },
  } as unknown as ClientContext
}

describe('role-config page controller staging', () => {
  it('shows the stored pool when the Host value arrives after the first projection', async () => {
    const form = fakeScope()
    const controller = new RoleConfigPageController(form.scope, hostContext())
    const snapshot = (): RoleConfigSettings => controller.inject().hooks.roleConfigPage.getSnapshot().draft
    // The first projection runs inside the constructor, before the value lands.
    expect(snapshot().pool).toEqual([])
    form.deliver(STORED)
    await vi.waitFor(() => { expect(snapshot().pool).toHaveLength(2) })
    expect(snapshot().pool[1]?.description).toBe('能力尚可的廉价模型')
    controller.dispose()
  })

  it('refuses to stage an edit before the form loads', () => {
    const form = fakeScope()
    const controller = new RoleConfigPageController(form.scope, hostContext())
    const face = controller.inject()
    face.edit(draft => ({ ...draft, exposure: { ...draft.exposure, listTool: false } }))
    expect(face.hooks.roleConfigPage.getSnapshot().draft.exposure.listTool).toBe(true)
    // Once loaded, the same edit stages against the stored value.
    form.deliver(STORED)
    face.edit(draft => ({ ...draft, exposure: { ...draft.exposure, listTool: false } }))
    const state = face.hooks.roleConfigPage.getSnapshot()
    expect(state.draft.exposure.listTool).toBe(false)
    expect(state.draft.pool).toHaveLength(2)
    expect(state.dirty).toBe(true)
    controller.dispose()
  })
})
