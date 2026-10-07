/**
 * The Role Config page, browser half: the pool, the role presets with their
 * chains and routing rules, and the switches, over one settings namespace on
 * the Plugins page.
 *
 * The page registers while the Host serves `role-config`, and the Host side
 * registers that namespace itself, so the page exists exactly when its
 * settings do.
 *
 * @module dsh-role-config/client
 */

// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the ctx.configForms Context merge. Cross-plugin collaboration
// goes through the service, never a value import.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the Plugins page's SlotMap merge (the 'plugins.item' entry).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the ctx.remote Context merge.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ROLE_CONFIG_NS, RoleConfigPageController } from './controller.ts'
import { RoleConfigPage } from './RoleConfigPage.tsx'
import { en, zh, type RoleConfigKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Role Config page copy. */
    'settings.role-config': RoleConfigKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.role-config'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.session', 'configForms']

/**
 * Mount the Role Config page while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'role-config: dictionaries')
  const controller = new RoleConfigPageController(ctx.configForms.get(ROLE_CONFIG_NS), ctx)
  ctx.effect(() => () => { controller.dispose() }, 'role-config: settings subscription')
  const face = controller.inject()
  ctx.effect(
    () => ctx.remote.$on('settings/document-updated', () => { void controller.loadCatalog() }),
    'role-config: settings invalidations',
  )
  ctx.effect(() => ctx.configForms.whileServed([ROLE_CONFIG_NS], () => ctx.slots.inject('plugins.item', () => ctx.slots.register({
    name: 'plugins.item',
    id: 'role-config',
    order: 40,
    label: () => t('title'),
    locale: NS,
    inject: () => face,
  }, RoleConfigPage))), 'role-config: page')
}
