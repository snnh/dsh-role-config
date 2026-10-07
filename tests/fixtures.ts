/** Plain settings documents for tests: every default spelled out. */

import type { RoleConfigSettings } from '../src/settings.ts'

/**
 * One settings document with the schema's defaults already resolved, so a
 * test states only the field it exercises.
 * @param over - fields to override.
 * @returns the plain settings value.
 */
export function plainSettings(over: Partial<RoleConfigSettings> = {}): RoleConfigSettings {
  const base: RoleConfigSettings = {
    pool: [],
    roles: [],
    bindings: {
      compact: { kind: 'off' },
      sessionTitle: { kind: 'off' },
      delegateDefault: { kind: 'off' },
    },
    exposure: { listTool: true, sessionStart: false, delegateTool: true },
    routing: { fallback: true, aiEnabled: false, aiTimeoutMs: 8000 },
    delegate: { provider: 'spawn', toolName: 'subagent', enableRunInBackground: true },
  }
  return {
    ...base,
    ...over,
    bindings: { ...base.bindings, ...over.bindings },
    exposure: { ...base.exposure, ...over.exposure },
    routing: { ...base.routing, ...over.routing },
    delegate: { ...base.delegate, ...over.delegate },
  }
}
