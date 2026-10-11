/**
 * Restoring the official delegation tool.
 *
 * The takeover only works because the official tool stays mounted in an outer
 * scope; a composition that disables it instead trades a shadowed tool for no
 * tool at all. These cases pin the two halves of that contract: what the scan
 * is willing to rewrite, and what it refuses to touch.
 */

import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { OFFICIAL_TOOL_PACKAGE } from '../src/official-tool.ts'
import { planOfficialToolRestore, restoreOfficialTool } from '../src/restore.ts'

/** One official row as a preset composes it. */
const officialRow = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'tool-subagent',
  name: OFFICIAL_TOOL_PACKAGE,
  config: { provider: 'spawn', toolName: 'subagent' },
  ...over,
})

/** A preset row holding a delegation group, the shipped composition's shape. */
const presetRow = (rows: readonly unknown[]): Record<string, unknown> => ({
  id: 'preset-standard',
  name: '@deepseek-ai/dsh-agent-preset',
  config: {
    id: 'standard',
    order: 1,
    plugins: [
      { id: 'persona', name: '@deepseek-ai/dsh-persona' },
      { id: 'delegation', name: 'cordis:group', group: true, config: rows },
    ],
  },
})

/** The delegation group of a planned preset row. */
function groupOf(next: unknown): readonly Record<string, unknown>[] {
  const config = (next as { config: { plugins: Record<string, unknown>[] } }).config
  return config.plugins[1]?.config as Record<string, unknown>[]
}

describe('planning the official-tool restore', () => {
  it('removes the takeover marker from the nested official row only', () => {
    const plan = planOfficialToolRestore(presetRow([
      officialRow({ disabled: true }),
      { id: 'tool-subagent-fork', name: OFFICIAL_TOOL_PACKAGE, config: { provider: 'fork', toolName: 'subagent_fork' } },
    ]), 'subagent')
    expect(plan?.rows).toEqual(['tool-subagent'])
    const group = groupOf(plan?.next)
    expect(group[0]).toEqual(officialRow())
    // The other row keeps its identity: nothing else was rebuilt.
    expect(group[1]).toEqual({ id: 'tool-subagent-fork', name: OFFICIAL_TOOL_PACKAGE, config: { provider: 'fork', toolName: 'subagent_fork' } })
  })

  it('reports nothing for a composition that never disabled the official row', () => {
    expect(planOfficialToolRestore(presetRow([officialRow()]), 'subagent')).toBeUndefined()
    expect(planOfficialToolRestore(presetRow([officialRow({ disabled: false })]), 'subagent')).toBeUndefined()
  })

  it('leaves a condition-valued disabled alone', () => {
    // `!!js` conditions belong to the composition, not to the takeover.
    const row = officialRow({ disabled: { __jsExpr: "process.platform === 'win32'" } })
    expect(planOfficialToolRestore(presetRow([row]), 'subagent')).toBeUndefined()
  })

  it('ignores an official row that serves another tool name', () => {
    const row = officialRow({ disabled: true, config: { provider: 'spawn', toolName: 'delegate' } })
    expect(planOfficialToolRestore(presetRow([row]), 'subagent')).toBeUndefined()
    expect(planOfficialToolRestore(presetRow([row]), 'delegate')?.rows).toEqual(['tool-subagent'])
  })

  it('walks a group whose config is the row list itself', () => {
    const plan = planOfficialToolRestore([officialRow({ disabled: true })], 'subagent')
    expect(plan?.rows).toEqual(['tool-subagent'])
    expect(plan?.next).toEqual([officialRow()])
  })

  it('keeps every unrelated value identical', () => {
    const next = planOfficialToolRestore(presetRow([officialRow({ disabled: true })]), 'subagent')?.next
    const plugins = (next as { config: { plugins: Record<string, unknown>[] } }).config.plugins
    expect(plugins[0]).toEqual({ id: 'persona', name: '@deepseek-ai/dsh-persona' })
  })
})

/** A Host context whose configuration editor records the edits it is asked for. */
function fakeHost(entries: readonly unknown[], edit: (entry: unknown, next: unknown) => Promise<void>): {
  ctx: Context
  edits: Array<{ entry: unknown; next: unknown }>
} {
  const edits: Array<{ entry: unknown; next: unknown }> = []
  const ctx = {
    get: (name: string) => name === 'configEditor'
      ? {
        entries: () => entries,
        edit: (entry: never, change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>) => {
          const next = change({}, {})
          edits.push({ entry, next })
          return edit(entry, next)
        },
      }
      : undefined,
  } as unknown as Context
  return { ctx, edits }
}

describe('restoring through the configuration editor', () => {
  it('edits the row that carries the marker and reports it', async () => {
    const entry = { options: { id: 'preset-standard', config: presetRow([officialRow({ disabled: true })]) } }
    const { ctx, edits } = fakeHost([entry, { options: { id: 'persona', config: { suffix: 'x' } } }], () => Promise.resolve())
    const warn = vi.fn()
    expect(await restoreOfficialTool({ ctx, toolName: 'subagent', warn })).toEqual(['tool-subagent'])
    expect(edits).toHaveLength(1)
    expect(edits[0]?.entry).toBe(entry)
    expect(groupOf(edits[0]?.next)[0]).toEqual(officialRow())
    expect(warn).not.toHaveBeenCalled()
  })

  it('writes nothing when the composition is already intact', async () => {
    const entry = { options: { id: 'preset-standard', config: presetRow([officialRow()]) } }
    const { ctx, edits } = fakeHost([entry], () => Promise.resolve())
    expect(await restoreOfficialTool({ ctx, toolName: 'subagent', warn: vi.fn() })).toEqual([])
    expect(edits).toHaveLength(0)
  })

  it('reports a refused edit instead of throwing', async () => {
    const entry = { options: { id: 'preset-standard', config: presetRow([officialRow({ disabled: true })]) } }
    const { ctx } = fakeHost([entry], () => Promise.reject(new Error('no longer available')))
    const warn = vi.fn()
    expect(await restoreOfficialTool({ ctx, toolName: 'subagent', warn })).toEqual([])
    expect(warn).toHaveBeenCalledWith(
      'could not re-enable the official delegation tool on row "%s": %s',
      'preset-standard',
      'no longer available',
    )
  })

  it('is a no-op without a configuration editor', async () => {
    const ctx = { get: () => undefined } as unknown as Context
    expect(await restoreOfficialTool({ ctx, toolName: 'subagent', warn: vi.fn() })).toEqual([])
  })
})
