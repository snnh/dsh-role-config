/**
 * The precondition of the shadow delegation tool.
 *
 * This plugin registers a tool under the official `subagent` name. That only
 * works while the official tool lives in an outer scope: with
 * `modelSelectionSettings: true` the official plugin installs its tool into
 * each agent's own scope, where a second registration of the same name
 * throws, and neither text shadowing nor `tools.restrict()` can hide it.
 *
 * The check below reads the Loader's own rows - including rows nested inside
 * an agent preset - so the operator gets one sentence naming the row and the
 * field instead of a duplicate-registration stack trace.
 *
 * @module dsh-role-config/official-tool
 */

import type { Context } from '@deepseek-ai/cordis'

/** The official delegation tool package. */
export const OFFICIAL_TOOL_PACKAGE = '@deepseek-ai/dsh-tool-subagent'

/** Env var name a deployment may use; kept for diagnostics wording. */
export interface OfficialCollision {
  /** Loader entry id of the offending row, as the operator sees it in a patch. */
  readonly rowId: string
  /** Module name the row mounts. */
  readonly moduleName: string
}

/** One row shape this scan understands. */
interface RowLike {
  readonly id?: unknown
  readonly name?: unknown
  readonly config?: unknown
}

/** Whether a row is the official delegation tool with model selection on. */
function collides(row: RowLike, toolName: string): boolean {
  if (row.name !== OFFICIAL_TOOL_PACKAGE) return false
  const config = (typeof row.config === 'object' && row.config !== null ? row.config : {}) as {
    toolName?: unknown
    modelSelectionSettings?: unknown
  }
  const rowToolName = typeof config.toolName === 'string' ? config.toolName : 'subagent'
  return rowToolName === toolName && config.modelSelectionSettings === true
}

/**
 * Find every official row that would collide with this plugin's tool.
 * @param ctx - the plugin's Host context (the Loader is read when present).
 * @param toolName - the name this plugin registers.
 * @returns offending rows, outermost first; empty when nothing collides.
 */
export function findOfficialModelSelectionRows(ctx: Context, toolName: string): OfficialCollision[] {
  const loader = ctx.get('loader')
  if (loader === undefined) return []
  const found: OfficialCollision[] = []
  const visit = (rows: readonly unknown[]): void => {
    for (const candidate of rows) {
      if (typeof candidate !== 'object' || candidate === null) continue
      const row = candidate as RowLike
      if (collides(row, toolName)) {
        found.push({
          rowId: typeof row.id === 'string' ? row.id : '(unnamed row)',
          moduleName: OFFICIAL_TOOL_PACKAGE,
        })
      }
      const config = row.config
      if (typeof config === 'object' && config !== null && Array.isArray((config as { plugins?: unknown }).plugins)) {
        visit((config as { plugins: unknown[] }).plugins)
      }
    }
  }
  const entries = (loader as { entries?: () => unknown }).entries
  if (typeof entries !== 'function') return []
  const rows = entries.call(loader)
  if (!Array.isArray(rows)) return []
  visit(rows.map((entry) => {
    const options = (entry as { options?: RowLike }).options
    return options === undefined ? {} : options
  }))
  return found
}

/**
 * The one sentence an operator needs, naming the fix.
 * @param collisions - offending rows found by {@link findOfficialModelSelectionRows}.
 * @param toolName - the name this plugin registers.
 * @returns the message to log.
 */
export function collisionAdvice(collisions: readonly OfficialCollision[], toolName: string): string {
  const rows = collisions.map(collision => `"${collision.rowId}"`).join(', ')
  return `the official delegation tool would collide with this plugin's "${toolName}" tool: row(s) ${rows} `
    + 'set modelSelectionSettings: true, which registers the official tool inside every agent scope where a '
    + 'same-named tool cannot be shadowed. Set modelSelectionSettings: false on those rows (the Subagent '
    + 'settings page then belongs to this plugin), or point delegate.toolName at another name.'
}
