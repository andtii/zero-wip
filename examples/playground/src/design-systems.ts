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
 * The swap is clean, including the part that looks like it wouldn't be.
 * `@property` registrations sit outside the cascade layers, in each compiled
 * stylesheet's preamble, so it is reasonable to expect them to outlive their
 * stylesheet and leave a visited design system's roles — material-only ones
 * like `--color-tertiary` — registered for the life of the page. They don't:
 * removing the stylesheet withdraws its registrations along with everything
 * else in it. Measured in Chromium across `basic → material → basic`.
 *
 * To re-measure, exploit the fact that a registered `<color>` property rejects
 * an invalid value at computed-value time and falls back, while an unregistered
 * one is a raw token stream that comes back verbatim:
 *
 *     el.style.setProperty('--color-tertiary', 'not-a-color');
 *     getComputedStyle(el).getPropertyValue('--color-tertiary').trim() === 'not-a-color'
 *         // ^ true  => unregistered
 *         // ^ false => registered, and you are seeing the fallback
 *
 * The `.trim()` matters: getPropertyValue can return the token stream with
 * surrounding whitespace, which would read as a mismatch and misreport an
 * unregistered property as registered.
 *
 * Nor is the brief two-`<link>` window observable: a stylesheet that is still
 * loading has a null `.sheet` and applies nothing, and the outgoing link is
 * removed before any frame in which both would be live. Sampling per animation
 * frame, the number of links with a non-null `.sheet` never exceeds one.
 */
import { signal } from 'sigx';
import { clearThemes, getTheme, themeController } from '@sigx/zero';

import basicCss from '@sigx/zero-basic/css?url';
import daisyuiCss from '@sigx/zero-daisyui/css?url';
import materialCss from '@sigx/zero-material/css?url';
import brutalistCss from '@sigx/zero-brutalist/css?url';
import herouiCss from '@sigx/zero-heroui/css?url';

import { installThemes as installBasic } from '@sigx/zero-basic';
import { installThemes as installDaisyui } from '@sigx/zero-daisyui';
import { installThemes as installMaterial } from '@sigx/zero-material';
import { installThemes as installBrutalist } from '@sigx/zero-brutalist';
import { installThemes as installHeroui } from '@sigx/zero-heroui';

// The DECLARED vocabulary, read from each compiled manifest rather than
// retyped here. Retyping is what made the axis rows below lie: they iterated
// a literal `['solid','outline','soft','ghost']`, so a design system with a
// different vocabulary rendered buttons that matched nothing — silently, since
// an unmatched `data-variant` is just an attribute nobody styled.
import basicManifest from '@sigx/zero-basic/manifest.json';
import daisyuiManifest from '@sigx/zero-daisyui/manifest.json';
import materialManifest from '@sigx/zero-material/manifest.json';
import brutalistManifest from '@sigx/zero-brutalist/manifest.json';
import herouiManifest from '@sigx/zero-heroui/manifest.json';

/**
 * What a design system says it offers, straight from its manifest.
 *
 * `colors` is empty for a design system with no colour axis — HeroUI v3
 * removed the prop entirely — and the playground renders no colour row rather
 * than four buttons that match nothing.
 */
export interface AxisVocabulary {
    colors: string[];
    sizes: string[];
    variants: string[];
    modifiers: string[];
}

interface DesignSystemManifest {
    tokens: {
        roles: Record<string, unknown>;
        sizes: string[];
        variants: string[];
        modifiers?: string[];
    };
}

const vocabularyOf = (manifest: DesignSystemManifest): AxisVocabulary => ({
    colors: Object.keys(manifest.tokens.roles),
    sizes: [...manifest.tokens.sizes],
    variants: [...manifest.tokens.variants],
    // Optional: a manifest built before modifiers existed has no such key.
    modifiers: [...(manifest.tokens.modifiers ?? [])],
});

export interface DesignSystemEntry {
    id: string;
    label: string;
    /** Compiled stylesheet URL — the design system itself. */
    href: string;
    /** Seeds the zero theme registry with this DS's themes. */
    installThemes: () => void;
    /** Declared axes, so the demo shows what THIS design system offers. */
    vocabulary: AxisVocabulary;
    blurb: string;
}

export const designSystems: DesignSystemEntry[] = [
    {
        id: 'basic',
        label: 'Basic',
        href: basicCss,
        installThemes: installBasic,
        vocabulary: vocabularyOf(basicManifest),
        blurb: 'Neutral starter — readable defaults, eight colour roles.',
    },
    {
        id: 'daisyui',
        label: 'daisyUI',
        href: daisyuiCss,
        installThemes: installDaisyui,
        vocabulary: vocabularyOf(daisyuiManifest),
        blurb: 'daisyUI token values over zero anatomy. No Tailwind involved.',
    },
    {
        id: 'material',
        label: 'Material',
        href: materialCss,
        installThemes: installMaterial,
        vocabulary: vocabularyOf(materialManifest),
        blurb: 'Thirteen colour roles, a level1–level5 elevation ramp, its own breakpoints.',
    },
    {
        id: 'brutalist',
        label: 'Brutalist',
        href: brutalistCss,
        installThemes: installBrutalist,
        vocabulary: vocabularyOf(brutalistManifest),
        blurb: 'Generated from a style brief through the design-system skill.',
    },
    {
        id: 'heroui',
        label: 'HeroUI',
        href: herouiCss,
        installThemes: installHeroui,
        vocabulary: vocabularyOf(herouiManifest),
        blurb: 'No colour axis at all — colour is fused into a seven-member variant. '
            + 'Component coverage is deliberately partial; it exists to test the axis surface.',
    },
];

const STORAGE_KEY = 'zero-ds';
const LINK_ATTR = 'data-zero-ds';

export const DEFAULT_DESIGN_SYSTEM = designSystems[0]!;

/**
 * The live design system, reactively.
 *
 * `activeDesignSystemId()` reads the document, which is the truth but is not
 * observable — and the axis rows have to re-render when the vocabulary
 * changes. The toolbar keeps its own copy for its busy/label handling; this is
 * the shared one, updated only after a swap actually commits.
 */
const active = signal({ id: DEFAULT_DESIGN_SYSTEM.id });

export function activeDesignSystem(): DesignSystemEntry {
    return designSystems.find((ds) => ds.id === active.id) ?? DEFAULT_DESIGN_SYSTEM;
}

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

    // Only now — a failed load leaves the previous design system live, and
    // the vocabulary the demo renders must describe the CSS that is actually
    // in the document.
    active.id = entry.id;

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
