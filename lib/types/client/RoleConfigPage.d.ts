/**
 * The Role Config page: the model pool, the role presets with their chains and
 * routing rules, and the switches that decide what the model may see.
 *
 * Controls are native elements with inline styles on purpose: this page ships
 * inside a fresh plugin bundle, and every extra shared dependency is a module
 * request the module table has to answer.
 *
 * @module dsh-role-config/client/RoleConfigPage
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { RoleConfigPageFace } from './controller.ts';
/** Props the Plugins page injects into this page. */
export type RoleConfigPageProps = PropsRuntime<'plugins.item'> & PropsLocale<'settings.role-config'> & InjectFace<RoleConfigPageFace>;
/**
 * Render the Role Config settings form.
 * @param props - locale copy, the page snapshot, and its actions.
 * @returns the summary line or the editable form.
 */
export declare function RoleConfigPage(props: RoleConfigPageProps): string | import("react").JSX.Element;
//# sourceMappingURL=RoleConfigPage.d.ts.map