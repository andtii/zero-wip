/**
 * @sigx/zero-basic runtime — theme metadata registration.
 *
 * The CSS is the design system (`@sigx/zero-basic/css`); this module only
 * seeds the zero theme registry so `useTheme()`/`themeController()` know the
 * available themes, their schemes and pairs.
 */
import { registerTheme } from '@sigx/zero';
import { tokens } from './tokens.js';

export { tokens } from './tokens.js';
export { recipes } from './recipes.js';
export { designSystem } from './design-system.js';

export function installThemes(): void {
    for (const [name, theme] of Object.entries(tokens.themes)) {
        registerTheme({
            name,
            colorScheme: theme.colorScheme,
            pair: theme.pair,
            swatch: {
                primary: theme.colors.primary,
                neutral: theme.colors.neutral,
                'base-100': theme.colors['base-100'],
                'base-content': theme.colors['base-content'],
            },
        });
    }
}
