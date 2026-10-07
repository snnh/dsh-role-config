import { format } from 'node:util'
import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import { FailoverRegistry } from '../src/failover.ts'

const CHAIN = [
  { provider: 'a', model: 'one' },
  { provider: 'a', model: 'two' },
  { provider: 'a', model: 'three' },
]

/** A stand-in child: the registry only ever keys a WeakMap by identity. */
function child(id = 'child'): Agent {
  return { id } as unknown as Agent
}

/** The config the loop would use without a failover. */
function config(): LlmCallConfig {
  return { provider: 'a', model: 'one', reasoningEffort: 'high' } as unknown as LlmCallConfig
}

function build(enabled = true): { registry: FailoverRegistry; warnings: string[] } {
  const warnings: string[] = []
  const registry = new FailoverRegistry({ warn: (message, ...args) => { warnings.push(format(message, ...args)) } }, () => enabled)
  return { registry, warnings }
}

describe('role-config priority failover', () => {
  it('ignores chains with nowhere to fall and agents it never started', () => {
    const { registry } = build()
    const single = child('single')
    registry.track(single, 'fast', [{ provider: 'a', model: 'one' }])
    expect(registry.tracks(single)).toBe(false)
    expect(registry.advance(child('other'))).toBe(false)
  })

  it('swaps the route on the next request, dropping the old model effort', () => {
    const { registry, warnings } = build()
    const agent = child()
    registry.track(agent, 'fast', CHAIN)
    expect(registry.tracks(agent)).toBe(true)

    // Untouched: the loop keeps the config it resolved.
    expect(registry.applyPending(agent, config())).toEqual(config())

    expect(registry.advance(agent)).toBe(true)
    const swapped = registry.applyPending(agent, config())
    expect(swapped).toEqual({ provider: 'a', model: 'two' })
    expect(warnings.join('\n')).toContain('retrying the same request on a/two')
    // The switch is consumed once: the following request keeps the new route.
    expect(registry.applyPending(agent, { provider: 'a', model: 'two' } as unknown as LlmCallConfig))
      .toEqual({ provider: 'a', model: 'two' })
  })

  it('walks the chain one member per failure and forgets an exhausted child', () => {
    const { registry, warnings } = build()
    const agent = child()
    registry.track(agent, 'fast', CHAIN)
    expect(registry.advance(agent)).toBe(true)
    registry.applyPending(agent, config())
    expect(registry.advance(agent)).toBe(true)
    registry.applyPending(agent, config())
    // The last member failed too: the original failure stands, and the child
    // is no longer tracked.
    expect(registry.advance(agent)).toBe(false)
    expect(registry.tracks(agent)).toBe(false)
    expect(warnings.join('\n')).toContain('exhausted its chain at a/three; the failure stands')
  })

  it('does nothing while the operator keeps failover off', () => {
    const { registry } = build(false)
    const agent = child()
    registry.track(agent, 'fast', CHAIN)
    expect(registry.advance(agent)).toBe(false)
    expect(registry.applyPending(agent, config())).toEqual(config())
  })

  it('forgets a settled child', () => {
    const { registry } = build()
    const agent = child()
    registry.track(agent, 'fast', CHAIN)
    registry.forget(agent)
    expect(registry.tracks(agent)).toBe(false)
    expect(registry.advance(agent)).toBe(false)
  })
})
