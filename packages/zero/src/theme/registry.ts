/**
 * Theme registry — metadata about the themes a design system compiled.
 *
 * Token VALUES live in the DS's CSS; the registry holds what the runtime
 * needs: names, color-scheme, light/dark pairing, and an optional swatch
 * palette for pickers/canvas/charts. Design-system packages seed it from
 * their `installThemes()` side-effect entry.
 *
 * Write-once configuration seeded at module load (identical on server and
 * client), so a module-level Map is safe under SSR.
 *
 * `clearThemes()` is the one exception, and it is client-only by intent: a host
 * that swaps design systems at runtime must shed the previous DS's themes,
 * because theme names are DS-specific and a stale entry would advertise a
 * `[data-theme]` block whose stylesheet is no longer loaded. Never call it per
 * SSR request — that would race concurrent renders sharing this module.
 */
import { RECOMMENDED_ROLE_LIST, defaultSwatch } from '../contract/tokens.js';

export interface ThemeInfo {
    name: string;
    colorScheme: 'light' | 'dark';
    /** The counterpart theme `toggle()` switches to. */
    pair?: string;
    /** Optional representative colors for theme pickers (token → CSS color). */
    swatch?: Record<string, string>;
}

const themes = new Map<string, ThemeInfo>();

export function registerTheme(info: ThemeInfo): void {
    themes.set(info.name, info);
}

/**
 * A design system's token declaration, as much of it as the registry needs.
 *
 * Typed STRUCTURALLY on purpose: `@sigx/zero-kit`'s `TokensInput` is
 * assignable to this, but zero never imports the kit — the kit is a Node-only
 * authoring tool and this code runs in the browser. The layering survives and
 * design systems still pass their `tokens` object whole.
 */
export interface ThemeSource {
    /**
     * The design system's color role declaration. Only the KEYS are read, and
     * their declaration order is the default swatch order.
     */
    roles?: Record<string, unknown>;
    /** Explicit swatch declaration; overrides the default derivation. */
    swatch?: readonly string[];
    themes: Record<string, {
        colorScheme: 'light' | 'dark';
        pair?: string;
        colors: Record<string, string>;
    }>;
}

/**
 * Seed the registry from a design system's declaration — the runtime half of
 * `@sigx/zero-kit`'s compile step, and the only thing a DS package's
 * `installThemes()` needs to call.
 *
 * The swatch is DERIVED from the declaration, never hardcoded: a design system
 * whose distinguishing colors aren't `primary`/`neutral` would otherwise get a
 * picker that renders every one of its themes identically. `defaultSwatch` is
 * the same rule the compiler applies, so what lands here matches the design
 * system's own `manifest.json`.
 */
export function registerThemes(source: ThemeSource): void {
    // No `roles` means the design system took the recommended vocabulary —
    // the kit's `resolveRoles` default, restated in terms zero already knows.
    const roleNames = source.roles ? Object.keys(source.roles) : RECOMMENDED_ROLE_LIST;
    const swatchTokens = source.swatch ?? defaultSwatch(roleNames);

    for (const [name, theme] of Object.entries(source.themes)) {
        registerTheme({
            name,
            colorScheme: theme.colorScheme,
            pair: theme.pair,
            // Skip tokens this theme doesn't define rather than registering
            // `undefined` — matches what the compiler emits.
            swatch: Object.fromEntries(
                swatchTokens.flatMap((token) =>
                    theme.colors[token] ? [[token, theme.colors[token]]] : []),
            ),
        });
    }
}

/**
 * Drop every registered theme — browser-only, for hosts that exchange design
 * systems at runtime. Re-seed immediately afterwards with the incoming DS's
 * `installThemes()`; between the two calls `listThemes()` is empty and
 * `pickThemeFor()` returns undefined.
 */
export function clearThemes(): void {
    themes.clear();
}

export function getTheme(name: string): ThemeInfo | undefined {
    return themes.get(name);
}

export function listThemes(): ThemeInfo[] {
    return [...themes.values()];
}

/** The registered pair of a theme, if any. */
export function pairOf(name: string): string | undefined {
    return themes.get(name)?.pair;
}

/** First registered theme matching a color scheme. */
export function pickThemeFor(scheme: 'light' | 'dark'): string | undefined {
    for (const t of themes.values()) {
        if (t.colorScheme === scheme) return t.name;
    }
    return undefined;
}
