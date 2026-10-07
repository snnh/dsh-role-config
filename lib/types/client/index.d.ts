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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type RoleConfigKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Role Config page copy. */
        'settings.role-config': RoleConfigKey;
    }
}
/** Dictionary namespace owned by this plugin. */
export declare const NS = "settings.role-config";
/** Required services (cordis fiber inject). */
export declare const inject: string[];
/**
 * Mount the Role Config page while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map