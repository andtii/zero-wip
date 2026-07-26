/**
 * The four design systems, switchable at runtime.
 *
 * A design system is a compiled stylesheet, so switching one is a `<link>`
 * swap — not a rebuild, and not a reload. The CSS is imported with `?url` so
 * Vite hands us an href instead of injecting the stylesheet at module load;
 * nothing here is styled until `activateDesignSystem()` runs.
 *
 * SWAP, DON'T STACK. Two design systems cannot coexist in one document: token
 * blocks are `[data-theme]`-scoped, but recipe CSS is not — every DS emits the
 * same bare `[data-scope="button"][data-part="root"]` selectors into the same
 * `@layer zero.recipes`. Same selector in the same layer resolves last-wins per
 * *declaration*, not per rule, so a second stylesheet blends into the first
 * rather than replacing it. Exactly one `link[data-zero-ds]` is live at a time.
 *
 * Known limitation: `@property` registrations sit outside the cascade layers,
 * as each compiled stylesheet's preamble, and are NOT withdrawn when that
 * stylesheet is removed. After visiting material, its role registrations —
 * including material-only ones like `--color-tertiary` — stay registered for
 * the lifetime of the page. Impact is small in practice, since every DS
 * assigns all of its own roles at `:where(:root)`, but a registered property
 * substitutes as a computed value rather than a token stream, so a live switch
 * is not byte-identical to a fresh load. Reload for pristine state.
 */
import { clearThemes, getTheme, themeController } from '@sigx/zero';

import basicCss from '@sigx/zero-basic/css?url';
import daisyuiCss from '@sigx/zero-daisyui/css?url';
import materialCss from '@sigx/zero-material/css?url';
import brutalistCss from '@sigx/zero-brutalist/css?url';

import { installThemes as installBasic } from '@sigx/zero-basic';
import { installThemes as installDaisyui } from '@sigx/zero-daisyui';
import { installThemes as installMaterial } from '@sigx/zero-material';
import { installThemes as installBrutalist } from '@sigx/zero-brutalist';

export interface DesignSystemEntry {
    id: string;
    label: string;
    /** Compiled stylesheet URL — the design system itself. */
    href: string;
    /** Seeds the zero theme registry with this DS's themes. */
    installThemes: () => void;
    blurb: string;
}

export const designSystems: DesignSystemEntry[] = [
    {
        id: 'basic',
        label: 'Basic',
        href: basicCss,
        installThemes: installBasic,
        blurb: 'Neutral starter — readable defaults, eight colour roles.',
    },
    {
        id: 'daisyui',
        label: 'daisyUI',
        href: daisyuiCss,
        installThemes: installDaisyui,
        blurb: 'daisyUI token values over zero anatomy. No Tailwind involved.',
    },
    {
        id: 'material',
        label: 'Material',
        href: materialCss,
        installThemes: installMaterial,
        blurb: 'Thirteen colour roles, a level1–level5 elevation ramp, its own breakpoints.',
    },
    {
        id: 'brutalist',
        label: 'Brutalist',
        href: brutalistCss,
        installThemes: installBrutalist,
        blurb: 'Generated from a style brief through the design-system skill.',
    },
];

const STORAGE_KEY = 'zero-ds';
const LINK_ATTR = 'data-zero-ds';

export const DEFAULT_DESIGN_SYSTEM = designSystems[0]!;

/** The persisted choice, falling back to the default for an unknown id. */
export function resolvePersistedDesignSystem(): DesignSystemEntry {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch {
        // Storage unavailable (privacy mode) — start from the default.
    }
    return designSystems.find((ds) => ds.id === stored) ?? DEFAULT_DESIGN_SYSTEM;
}

/** The design system whose stylesheet is currently in the document. */
export function activeDesignSystemId(): string | undefined {
    return document.querySelector(`link[${LINK_ATTR}]`)?.getAttribute(LINK_ATTR) ?? undefined;
}

/**
 * Load a design system's stylesheet and make it the only one.
 * Resolves `true` once it is active, `false` if the stylesheet failed to load.
 *
 * The new link is appended and awaited BEFORE the old one is removed, so the
 * page never renders through a frame with no design system. Appending also
 * puts the DS last in document order, which is what keeps its `:where(:root)`
 * block winning over `brand-theme.css` inside `@layer zero.tokens`.
 *
 * A failed load commits nothing. Tearing down the previous stylesheet and
 * re-seeding the registry anyway would leave the page unstyled while the
 * registry claimed otherwise — themes advertised for a design system whose CSS
 * never arrived, which is precisely the desync `clearThemes()` exists to
 * prevent. The old design system stays live instead.
 */
export async function activateDesignSystem(entry: DesignSystemEntry): Promise<boolean> {
    const previous = document.querySelector(`link[${LINK_ATTR}]`);
    if (previous?.getAttribute(LINK_ATTR) === entry.id) return true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = entry.href;
    link.setAttribute(LINK_ATTR, entry.id);

    const loaded = await new Promise<boolean>((resolve) => {
        // Never reject: an unbuilt design system should leave the playground
        // usable rather than hanging the boot.
        link.addEventListener('load', () => resolve(true), { once: true });
        link.addEventListener('error', () => resolve(false), { once: true });
        document.head.append(link);
    });

    if (!loaded) {
        console.error(`[playground] failed to load the ${entry.id} stylesheet — run \`pnpm build\``);
        link.remove();
        return false;
    }

    previous?.remove();

    // Theme names are DS-specific, so the registry is replaced, not extended.
    clearThemes();
    entry.installThemes();
    reconcileTheme();

    try {
        localStorage.setItem(STORAGE_KEY, entry.id);
    } catch {
        // Persistence is best-effort.
    }
    return true;
}

/**
 * Drop an explicit theme that the active design system doesn't define.
 *
 * `index.html` restores `data-theme` before first paint, but that name may
 * belong to a design system you are no longer using. The failure is silent —
 * no `[data-theme]` block matches, so you quietly get the active DS's `:root`
 * defaults instead. Falling back to `null` (follow the system) is honest, and
 * needs no JS of its own: compiled themes use `light-dark()`.
 */
export function reconcileTheme(): void {
    const current = themeController().theme();
    if (current && !getTheme(current)) themeController().setTheme(null);
}
