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
 */

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
