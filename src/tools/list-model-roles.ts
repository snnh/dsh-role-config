/**
 * The listing tool: the model asks, only then does it learn the roles and the
 * pool. Nothing about roles or models rides in the system prompt by default,
 * so a session that never delegates pays no tokens for the configuration.
 *
 * @module dsh-role-config/tools/list-model-roles
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { RoleConfigProblem, RoleConfigSettings } from '../settings.ts'
import { projectCatalog, renderCatalog } from '../catalog.ts'

/** The settings reader the tool serves from. */
export interface RoleCatalogSource {
  /** Current settings snapshot. */
  settings(): RoleConfigSettings
  /** Current cross-field findings; empty when the configuration is sound. */
  problems(): readonly RoleConfigProblem[]
}

/** Model-facing tool name. */
export const LIST_ROLES_TOOL_NAME = 'list_model_roles'

/** Description shown to the model. */
export const LIST_ROLES_TOOL_DESCRIPTION =
  'List the operator\'s role presets and model pool before delegating: roles accept a `role` id on the '
  + 'delegation tool (the operator\'s routing rules pick the model behind a role), and pool models accept an '
  + 'explicit provider and model. Call this when the choice of delegate matters; the listing is the only '
  + 'place the operator\'s descriptions live.'

/**
 * Register the listing tool on one scope.
 * @param ctx - the tool-hosting context (an agent scope, or the plugin's own).
 * @param source - the settings reader.
 * @returns the registration disposer.
 */
export function registerListRolesTool(ctx: Context, source: RoleCatalogSource): () => void {
  return ctx.tools.register(defineTool({
    name: LIST_ROLES_TOOL_NAME,
    description: LIST_ROLES_TOOL_DESCRIPTION,
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          roles: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                label: { type: 'string', required: true },
                description: { type: 'string', required: true },
              },
            },
          },
          models: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                provider: { type: 'string', required: true },
                model: { type: 'string', required: true },
                label: { type: 'string', required: true },
                description: { type: 'string', required: true },
              },
            },
          },
          problems: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderCatalog(value) }],
    },
    // Reads the settings snapshot only; concurrent calls cannot interfere.
    isConcurrencySafe: () => true,
    execute: () => Promise.resolve(projectCatalog(source.settings(), source.problems())),
  }))
}
