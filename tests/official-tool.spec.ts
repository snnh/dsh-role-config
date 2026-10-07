/**
 * The collision scan's reach: the official delegation tool hides inside
 * whichever composition shape a deployment uses, and a row the scan misses
 * costs a failed session rather than a log line.
 */

import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { OFFICIAL_TOOL_PACKAGE, collisionAdvice, findOfficialModelSelectionRows } from '../src/official-tool.ts'

/** A Host context whose Loader answers with the given rows. */
function ctxWith(rows: readonly unknown[]): Context {
  return {
    get: (name: string) => (name === 'loader' ? { entries: () => rows.map(options => ({ options })) } : undefined),
  } as unknown as Context
}

/** The official tool row with model selection on, as a preset reaches the loader. */
const official = (toolName = 'subagent', modelSelectionSettings = true): Record<string, unknown> => ({
  id: 'tool-subagent',
  name: OFFICIAL_TOOL_PACKAGE,
  config: { provider: 'spawn', toolName, modelSelectionSettings },
})

describe('official delegation tool collision scan', () => {
  it('finds the row at the top level', () => {
    expect(findOfficialModelSelectionRows(ctxWith([official()]), 'subagent'))
      .toEqual([{ rowId: 'tool-subagent', moduleName: OFFICIAL_TOOL_PACKAGE }])
  })

  it('finds the row nested in a group whose config is the child array', () => {
    // How a shipped preset composes delegation: a `cordis:group` row carrying
    // its children as the config array itself.
    const group = {
      id: 'delegation',
      name: 'cordis:group',
      group: true,
      config: [
        { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
        official(),
      ],
    }
    expect(findOfficialModelSelectionRows(ctxWith([group]), 'subagent'))
      .toEqual([{ rowId: 'tool-subagent', moduleName: OFFICIAL_TOOL_PACKAGE }])
  })

  it('finds the row nested under plugins', () => {
    const preset = { id: 'preset', name: 'dsh-agent-preset', config: { plugins: [official()] } }
    expect(findOfficialModelSelectionRows(ctxWith([preset]), 'subagent')).toHaveLength(1)
  })

  it('ignores a row whose tool name or model selection cannot collide', () => {
    expect(findOfficialModelSelectionRows(ctxWith([official('subagent', false)]), 'subagent')).toEqual([])
    expect(findOfficialModelSelectionRows(ctxWith([official('subagent_fork')]), 'subagent')).toEqual([])
    expect(findOfficialModelSelectionRows(ctxWith([
      { id: 'other', name: '@deepseek-ai/dsh-tool-bash', config: { toolName: 'subagent' } },
    ]), 'subagent')).toEqual([])
  })

  it('names the row and both fixes in the advice', () => {
    const collisions = findOfficialModelSelectionRows(ctxWith([official()]), 'subagent')
    const advice = collisionAdvice(collisions, 'subagent')
    expect(advice).toContain('"tool-subagent"')
    expect(advice).toContain('modelSelectionSettings: false')
    expect(advice).toContain('delegate.toolName')
  })

  it('reports nothing without a Loader', () => {
    expect(findOfficialModelSelectionRows({ get: () => undefined } as unknown as Context, 'subagent')).toEqual([])
  })
})
