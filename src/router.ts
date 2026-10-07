/**
 * The optional AI routing stage.
 *
 * A role's condition rules are exact and free. When none of them matches and
 * the operator turned AI routing on, one small model call decides between the
 * role's members instead of the static chain head, reading the delegation
 * prompt and each member's own description.
 *
 * The call is auxiliary: it belongs to no session, its failure is never fatal
 * (the chain head serves instead), and it is bounded by its own deadline
 * fused with the caller's cancellation.
 *
 * @module dsh-role-config/router
 */

import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { RouteMember, Routing } from './settings.ts'
import { routeKey } from './settings.ts'

/** Minimal logger face; the whole plugin logs through this. */
export interface RouterLogger {
  /** Log one best-effort diagnostic. */
  warn(message: string, ...args: unknown[]): void
}

/** One member offered to the router model. */
export interface RouterCandidate {
  /** The route the router may answer with. */
  readonly route: RouteMember
  /** Display name, when the operator set one. */
  readonly label: string
  /** The operator's description of what this model is good at. */
  readonly description: string
  /** Facts worth telling the router (declared modalities, context window). */
  readonly declared: string[]
}

/** System instruction: one choice, one line. */
const ROUTER_SYSTEM = [
  'You pick exactly one model for a delegated coding task.',
  'Answer with the model key from the list, on its own, and nothing else.',
  'Prefer the model whose description matches what the task needs; the list order is a fallback preference.',
].join(' ')

/**
 * Ask the router model which member should serve one delegation.
 *
 * @param options.llm - the LLM service; absent means the stage cannot run.
 * @param options.logger - diagnostic sink.
 * @param options.routing - the live routing settings (router route, deadline).
 * @param options.roleId - role being routed, for the prompt.
 * @param options.prompt - the delegation prompt the model supplied.
 * @param options.candidates - members the router may choose from.
 * @param options.signal - caller cancellation.
 * @returns the chosen member, or undefined when the stage is unavailable,
 * fails, times out, or answers nothing usable.
 */
export async function askRouter(options: {
  llm: LlmRuntime | undefined
  logger: RouterLogger
  routing: Routing
  roleId: string
  prompt: string
  candidates: readonly RouterCandidate[]
  signal: AbortSignal
}): Promise<RouteMember | undefined> {
  const { llm, logger, routing, roleId, prompt, candidates, signal } = options
  const provider = routing.aiProvider ?? ''
  const model = routing.aiModel ?? ''
  if (llm === undefined || provider.length === 0 || model.length === 0 || candidates.length === 0) return undefined
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(routing.aiTimeoutMs)])
  const request: GenerateOptions = {
    provider,
    model,
    system: ROUTER_SYSTEM,
    messages: [createUserMessage({
      content: [{ type: 'text', text: renderPrompt(roleId, prompt, candidates) }],
      source: { kind: 'user' },
    })],
    maxTokens: 64,
    signal: deadline,
  }
  try {
    const assembler = new BlockAssembler()
    for await (const chunk of llm.stream(request)) assembler.push(chunk)
    const text = assembler.blocks()
      .filter((block): block is Extract<ReturnType<BlockAssembler['blocks']>[number], { type: 'text' }> => block.type === 'text')
      .map(block => block.text)
      .join(' ')
    const chosen = matchCandidate(text, candidates)
    if (chosen === undefined) {
      logger.warn(`router answered no known member for role "${roleId}": %s`, text.slice(0, 200))
    }
    return chosen
  } catch (error: unknown) {
    // A routing aid that fails must never fail the delegation: the chain head
    // serves instead, exactly as it would with AI routing switched off.
    logger.warn(`router call failed for role "${roleId}": %s`, error instanceof Error ? error.message : String(error))
    return undefined
  }
}

/** Render the routing question: the task, then the members. */
function renderPrompt(roleId: string, prompt: string, candidates: readonly RouterCandidate[]): string {
  const lines = [
    `Role: ${roleId}`,
    '',
    'Task:',
    prompt,
    '',
    'Members (answer with one model key):',
  ]
  for (const candidate of candidates) {
    const parts = [`- ${routeKey(candidate.route)}${candidate.label.length > 0 ? ` (${candidate.label})` : ''}`]
    if (candidate.description.length > 0) parts.push(`: ${candidate.description}`)
    if (candidate.declared.length > 0) parts.push(` [${candidate.declared.join(', ')}]`)
    lines.push(parts.join(''))
  }
  return lines.join('\n')
}

/** Find the first candidate whose key the answer names. */
function matchCandidate(answer: string, candidates: readonly RouterCandidate[]): RouteMember | undefined {
  const lowered = answer.toLowerCase()
  const exact = candidates.find(candidate => lowered.includes(routeKey(candidate.route).toLowerCase()))
  if (exact !== undefined) return exact.route
  const byId = candidates.find(candidate => lowered.includes(candidate.route.model.toLowerCase()))
  return byId?.route
}
