/**
 * @sigx/zero-brutalist runtime — theme metadata registration.
 *
 * The CSS is the design system (`@sigx/zero-brutalist/css`); this module only
 * seeds the zero theme registry so `useTheme()`/`themeController()` know the
 * available themes, their schemes and pairs.
 */
import { registerTheme } from '@sigx/zero';
import { roles, tokens } from './tokens.js';

export { roles, system, systemDark, tokens } from './tokens.js';
export { recipes } from './recipes.js';
export { designSystem } from './design-system.js';

/**
 * Swatch tokens, taken from the design system's own `swatch` declaration.
 *
 * Derived rather than hardcoded: Material's distinguishing colours are its
 * tonal surfaces, not `primary`/`neutral`, so a picker that ignored the
 * declaration would render every Material theme as the same two swatches.
 * The fallback mirrors the kit's — the first four roles plus the base pair.
 */
const swatchTokens: string[] =
    tokens.swatch ?? [...Object.keys(roles).slice(0, 4), 'base-100', 'base-content'];

export function installThemes(): void {
    for (const [name, theme] of Object.entries(tokens.themes)) {
        const colors = theme.colors as Record<string, string>;
        registerTheme({
            name,
            colorScheme: theme.colorScheme,
            pair: theme.pair,
            swatch: Object.fromEntries(
                swatchTokens.flatMap((token) => (colors[token] ? [[token, colors[token]]] : [])),
            ),
        });
    }
}
