/**
 * The model-facing projection of the settings.
 *
 * What the model may know: role names and descriptions (never their members),
 * and pool models with the user's description so it can name one directly.
 * What it never sees here: a role's chain, its rules, or which model a role
 * would route to.
 *
 * @module dsh-role-config/catalog
 */

import type { RoleConfigProblem, RoleConfigSettings } from './settings.ts'
import { routeLabel } from './settings.ts'

/** One role as the model sees it. */
export interface RoleView {
  /** Role id the delegation tool accepts as `role`. */
  readonly id: string
  /** Display name. */
  readonly label: string
  /** What the role is for. */
  readonly description: string
}

/** One pool model as the model sees it. */
export interface ModelView {
  /** Provider route to pass with {@link ModelView.model}. */
  readonly provider: string
  /** Model id to pass with {@link ModelView.provider}. */
  readonly model: string
  /** Display name, when the user set one. */
  readonly label: string
  /** The user's description of what this model is good at. */
  readonly description: string
}

/** Everything the listing tool reports. */
export interface CatalogView {
  /** Configured roles, in group order. */
  readonly roles: RoleView[]
  /** Pool models the model may name directly. */
  readonly models: ModelView[]
  /** Configuration problems the user should fix, as short sentences. */
  readonly problems: string[]
}

/**
 * Project one settings snapshot for the model.
 * @param settings - current settings snapshot.
 * @param problems - validation findings to surface alongside the catalog.
 * @returns the projection served by the listing tool.
 */
export function projectCatalog(
  settings: RoleConfigSettings,
  problems: readonly RoleConfigProblem[],
): CatalogView {
  const roles: RoleView[] = settings.roles.map(role => ({
    id: role.id,
    label: role.label,
    description: role.description ?? '',
  }))
  const models: ModelView[] = settings.pool.map(entry => ({
    provider: entry.provider,
    model: entry.model,
    label: entry.label ?? entry.model,
    description: entry.description,
  }))
  return {
    roles,
    models,
    problems: problems.map(problem => `${problem.path}: ${problem.message}`),
  }
}

/**
 * Render the projection as compact text for the model.
 * @param view - the projection to render.
 * @returns the model-facing description, or a sentence saying nothing is set up.
 */
export function renderCatalog(view: CatalogView): string {
  const lines: string[] = []
  if (view.roles.length > 0) {
    lines.push('Role presets (delegate with role=<id>; the models behind a role are the operator\'s choice):')
    for (const role of view.roles) {
      lines.push(`- ${role.id} ${role.label}${role.description.length > 0 ? `: ${role.description}` : ''}`)
    }
  }
  if (view.models.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('Models you may name directly (provider + model):')
    for (const model of view.models) {
      const name = model.label === model.model ? '' : ` (${model.label})`
      lines.push(`- ${routeLabel(model)}${name}${model.description.length > 0 ? `: ${model.description}` : ''}`)
    }
  }
  if (lines.length === 0) {
    return 'No role presets and no model pool are configured on this deployment yet.'
  }
  if (view.problems.length > 0) {
    lines.push('')
    lines.push('Configuration problems the operator should fix:')
    for (const problem of view.problems) lines.push(`- ${problem}`)
  }
  return lines.join('\n')
}
