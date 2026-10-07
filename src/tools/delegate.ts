/**
 * The delegation tool: the model's only way to start a subagent here.
 *
 * It is registered under the official tool's own name and replaces it for
 * every agent (see `official-tool.ts` for the precondition). Its parameter
 * surface mirrors the official tool — `description`, `prompt`, and
 * `run_in_background` — and adds the two ways this plugin decides a route:
 * `role` (the operator's rules pick the model) and `provider` + `model` (the
 * model names a pool member directly).
 *
 * Everything else is the official behaviour: one child published through
 * `ctx.subagents`, one-shot background through `ctx.jobs`, and the child's
 * final output returned to the caller.
 *
 * @module dsh-role-config/tools/delegate
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { parentAgentOptionsForDelegation, settleRun } from '@deepseek-ai/dsh-subagent'
import type { SubagentRun, SubagentStopReason } from '@deepseek-ai/dsh-subagent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JobOutcome } from '@deepseek-ai/dsh-jobs'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { FailoverRegistry } from '../failover.ts'
import type { DelegationPlanner } from '../plan.ts'
import type { RoleConfigSettings } from '../settings.ts'
import { routeLabel } from '../settings.ts'

/** Services the delegation tool reads at call time. */
export interface DelegateDeps {
  /** Current settings snapshot reader. */
  settings(): RoleConfigSettings
  /** Request resolver: roles, rules, the optional router, direct routes. */
  planner: DelegationPlanner
  /** Children this plugin started through a role, for priority failover. */
  failover: FailoverRegistry
  /** Operator-facing diagnostics, also mirrored to the console. */
  warn(message: string): void
}

/** Deterministic wording for a child that does not share the parent's turns. */
const FRESH_DESCRIPTION =
  'Delegate a self-contained task to a subagent (a separate agent that works in its own context) '
  + 'to offload focused, independent work — research, a scoped implementation, an analysis — so it '
  + 'does not consume this conversation\'s context. The subagent returns its result, not its '
  + 'intermediate steps. Pick the delegate with `role` (the operator\'s routing rules choose the '
  + 'model) or with an explicit `provider` and `model` from list_model_roles.'

/** Prompt wording that matches {@link FRESH_DESCRIPTION}. */
const FRESH_PROMPT_DESCRIPTION =
  'The complete, self-contained task for the subagent. It does not share this conversation\'s '
  + 'context, so include everything it needs.'

/**
 * Register the delegation tool on one scope.
 * @param ctx - the tool-hosting context (an agent scope).
 * @param deps - settings, planner, failover registry, diagnostics.
 * @returns the registration disposer.
 */
export function registerDelegateTool(ctx: Context, deps: DelegateDeps): () => void {
  const backgroundEnabled = () => deps.settings().delegate.enableRunInBackground
  const tool = defineTool({
    name: deps.settings().delegate.toolName,
    description: FRESH_DESCRIPTION,
    parameters: {
      description: {
        type: 'string',
        required: true,
        description: 'A short (3-5 word) description of the delegated task, for display.',
      },
      prompt: {
        type: 'string',
        required: true,
        description: FRESH_PROMPT_DESCRIPTION,
      },
      role: {
        type: 'string',
        description: 'Role preset id from list_model_roles. The operator\'s routing rules choose the '
          + 'model behind it, including on failure. Omit when naming a provider and model directly.',
      },
      provider: {
        type: 'string',
        description: 'Provider route of a pool model, supplied together with `model`.',
      },
      model: {
        type: 'string',
        description: 'Pool model id advertised by list_model_roles, supplied together with `provider`.',
      },
      ...backgroundEnabled() ? {
        run_in_background: {
          type: 'boolean' as const,
          description: 'Run as a background job and return its id (collect with job_output, stop with '
            + 'job_kill). Defaults to false; use it when your next action does not depend on the result.',
        },
      } : {},
    },
    output: {
      schema: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'background' },
              jobId: { type: 'string', required: true },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'foreground' },
              runId: { type: 'string', required: true },
              output: { type: 'array', required: true, items: { type: 'json' } },
            },
          },
        ],
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.kind === 'background'
          ? `started background subagent job ${value.jobId}`
          : outputText(value.output),
      }],
    },
    // Children mutate their own sessions; the only parent-owned write is the
    // synchronous catalog append, exactly as the official tool notes.
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (!parent) throw new Error('the delegation tool requires a calling agent')
      const settings = deps.settings()
      const providerName = settings.delegate.provider
      if (ctx.subagents.getProvider(providerName) === undefined) {
        throw new Error(`subagent provider "${providerName}" is not registered; load its provider plugin `
          + 'or point `delegate.provider` at one that is')
      }
      const plan = await deps.planner.plan(
        {
          prompt: args.prompt,
          ...args.role === undefined ? {} : { role: args.role },
          ...args.provider === undefined ? {} : { provider: args.provider },
          ...args.model === undefined ? {} : { model: args.model },
        },
        exec.signal,
      )
      if (plan.route !== undefined) await preflightRoute(ctx, plan.route, exec.signal)
      // The parent's effort belongs to the parent's model; a route the
      // operator's rules chose keeps the child model's own default.
      const { reasoningEffort: _parentEffort, ...parentOptions } = parentAgentOptionsForDelegation(parent)
      const childOptions = plan.route === undefined
        ? undefined
        : { ...parentOptions, provider: plan.route.provider, model: plan.route.model }
      const maxDepth = ctx.subagents.resolveMaxDepth(undefined)
      const request = {
        label: args.description,
        prompt: [{ type: 'text', text: args.prompt }] as ContentBlock[],
        parent,
        ...childOptions === undefined ? {} : { agentOptions: childOptions },
        ...maxDepth === undefined ? {} : { maxDepth },
      }
      const track = (run: SubagentRun): void => {
        const child = run.localAgent
        if (child === undefined || plan.role === undefined) return
        deps.failover.track(child, plan.role, plan.chain)
      }

      if (args.run_in_background === true) {
        const jobs = ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs')
        }
        const label = args.description
        const jobId = jobs.start({
          kind: 'subagent',
          label,
          owner: parent.id,
          run: () => {
            const controller = new AbortController()
            const start = ctx.subagents.start(providerName, { ...request, signal: controller.signal })
            return {
              cancel: (reason?: string) => {
                controller.abort(reason ?? 'background subagent task killed')
              },
              done: settleStarted(start, controller.signal, track),
            }
          },
        })
        return Promise.resolve({ kind: 'background' as const, jobId })
      }

      const run = await ctx.subagents.start(providerName, { ...request, signal: exec.signal })
      track(run)
      return settleForeground(run)
    },
  })
  const scope = scopeOf(ctx)
  if (scope === undefined) {
    throw new Error('role-config: the delegation tool needs a scoped context (agent.ctx)')
  }
  return ctx.tools.register(tool)
}

/** Fail a delegation whose route no adapter can serve, before a child exists. */
async function preflightRoute(
  ctx: Context,
  route: { provider: string; model: string },
  signal: AbortSignal,
): Promise<void> {
  const llm = ctx.get('llm')
  if (llm === undefined) return
  try {
    await llm.resolveModelInfo(route.provider, route.model, signal)
  } catch (error: unknown) {
    throw new Error(
      `cannot route to ${routeLabel(route)}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/** Reason a settled run must surface as an error, mirroring the official tool. */
function stopReasonError(result: { stopReason: SubagentStopReason; diagnostic?: string }): string | undefined {
  if (result.stopReason === 'completed') return undefined
  const detail = result.diagnostic === undefined || result.diagnostic.length === 0
    ? `subagent stopped with ${result.stopReason}`
    : `subagent stopped with ${result.stopReason}: ${result.diagnostic}`
  return detail
}

/** Collect and release one foreground run. */
async function settleForeground(run: SubagentRun): Promise<
  { kind: 'foreground'; runId: string; output: JsonValue[] }
> {
  const result = await run.result
  const error = stopReasonError(result)
  try {
    await run.dispose()
  } catch (disposalError: unknown) {
    if (error !== undefined) {
      throw new AggregateError([new Error(error), disposalError], `subagent run failed: ${error}; dispose failed`)
    }
    throw disposalError
  }
  if (error !== undefined) throw new Error(error)
  return { kind: 'foreground', runId: run.id, output: result.output as unknown as JsonValue[] }
}

/** Settle one background start into a job outcome. */
async function settleStarted(
  start: Promise<SubagentRun>,
  signal: AbortSignal,
  track: (run: SubagentRun) => void,
): Promise<JobOutcome> {
  try {
    const run = await start
    track(run)
    return await settleRun(run)
  } catch (error: unknown) {
    return signal.aborted && !(error instanceof AggregateError)
      ? { status: 'killed', detail: String(error) }
      : { status: 'failed', detail: String(error) }
  }
}

/** Join the text blocks of one canonical output for the model-facing render. */
function outputText(values: readonly JsonValue[]): string {
  return values
    .filter((value): value is { type: 'text'; text: string } =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
      && (value as { type?: unknown }).type === 'text'
      && typeof (value as { text?: unknown }).text === 'string')
    .map(value => value.text)
    .join('')
}
