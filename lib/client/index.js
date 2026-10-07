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
import { ROLE_CONFIG_NS, RoleConfigPageController } from "./controller.js";
import { RoleConfigPage } from "./RoleConfigPage.js";
import { en, zh } from "./locales.js";
/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.role-config';
/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.session', 'configForms'];
/**
 * Mount the Role Config page while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx) {
    const t = ctx.locale.bind(NS);
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'role-config: dictionaries');
    const controller = new RoleConfigPageController(ctx.configForms.get(ROLE_CONFIG_NS), ctx);
    ctx.effect(() => () => { controller.dispose(); }, 'role-config: settings subscription');
    const face = controller.inject();
    ctx.effect(() => ctx.remote.$on('settings/document-updated', () => { void controller.loadCatalog(); }), 'role-config: settings invalidations');
    ctx.effect(() => ctx.configForms.whileServed([ROLE_CONFIG_NS], () => ctx.slots.inject('plugins.item', () => ctx.slots.register({
        name: 'plugins.item',
        id: 'role-config',
        order: 40,
        label: () => t('title'),
        locale: NS,
        inject: () => face,
    }, RoleConfigPage))), 'role-config: page');
}
//# sourceMappingURL=index.js.map