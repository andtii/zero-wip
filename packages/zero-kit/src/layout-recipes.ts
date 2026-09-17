/**
 * The layout pack — the recipes and the step table that paint zero's layout
 * tier, generated from a design system's own declarations.
 *
 * Every design system gets the same layout components, and they must behave
 * identically in all of them: `gap="md"` means the `md` rung of `--space-*`
 * everywhere, or a page laid out against one skin falls apart under the next.
 * The skin chooses what `--space-md` IS; it does not choose what `md` MEANS.
 * So this is generated, not authored six times.
 *
 * ## Two layers, and why
 *
 * The obvious construction puts the `md → var(--space-md)` mapping inside each
 * component's recipe. That is wrong, and expensively so: the mapping is ONE
 * fact for the whole design system, and emitting it per-scope multiplies it by
 * the number of layout scopes and then again by the breakpoint tiers. Measured
 * at ~900 rules per skin, ~200 KB, duplicated into `index.css`.
 *
 * Hoisted, it is two layers of ordinary static CSS:
 *
 * 1. **The step table** ({@link layoutCss}) — scope-agnostic, emitted once per
 *    design system through `DesignSystemInput.css`, mapping an attribute value
 *    to a custom property: `[data-l-gap="md"] { --l-gap: var(--space-md) }`.
 * 2. **The scope rules** ({@link layoutRecipes}) — each layout part declares
 *    its DEFAULTS as component tokens and then consumes them:
 *    `--l-gap: 0` plus `column-gap: var(--l-gap-x)`.
 *
 * ~270 rules per skin instead of ~900, in one place, with no inline styles and
 * nothing added to the closed `RUNTIME_PROPERTIES` list. A skin keeps full
 * control: it can repoint `[data-l-gap="md"]` at any token it likes.
 *
 * ## Why the defaults are declarations rather than var() fallbacks
 *
 * Writing `column-gap: var(--l-gap-x, 0)` would work on the web but leaves two
 * problems. Custom properties INHERIT, so a `Grid` nested inside a gapped
 * `Row` would pick up the Row's `--l-gap` — the fallback never runs, because
 * the property is set, just not by this element. And on the lynx target, where
 * the table is not emitted at all (`ds.css` is deliberately dropped there),
 * every reference would be an undeclared one.
 *
 * Declaring the default ON the carrier fixes both at once: a nested layout
 * part re-declares its own `--l-gap`, so nothing leaks in, and the property is
 * always defined, so `assertNoDanglingVars` passes and lynx renders the
 * degraded-but-sane baseline (a flex row with no gap) instead of nothing.
 *
 * It does mean the table must out-specify the carrier: a component token block
 * is `[data-scope="stack"][data-part="root"]` at (0,2,0), so the table is
 * written as `[data-scope][data-part][data-l-gap="md"]` at (0,3,0). Bare
 * `[data-l-gap="md"]` at (0,1,0) would lose to the default it exists to
 * override — silently, since both are custom properties.
 */
import type { RecipeInput } from './recipes.js';
import type { ScopeVocabulary, TokensInput } from './tokens.js';
import { LAYOUT_ATTR_PREFIX, layoutAttrSpec } from './contract.js';
import type { LayoutAttrName } from './contract.js';

/** The scopes this pack paints. Grows as the layout tier does. */
export const LAYOUT_SCOPES = ['stack', 'spacer'] as const;

/**
 * The layout attributes the emitted scopes actually consume.
 *
 * Deliberately not "every attribute in the vocabulary": a table entry for an
 * attribute no scope reads is a rule that can never match, which is the same
 * dead-CSS the axis validator exists to catch elsewhere.
 */
const USED_ATTRS: readonly LayoutAttrName[] = [
    'gap', 'gap-x', 'gap-y',
    'pad', 'pad-x', 'pad-y',
    'align', 'justify', 'wrap', 'grow', 'space',
];

/** Attributes whose values name a rung of the `--space-*` ramp. */
const SPACE_VALUED: ReadonlySet<string> = new Set(['gap', 'gap-x', 'gap-y', 'pad', 'pad-x', 'pad-y', 'space']);

/**
 * Attributes whose values are CSS keywords rather than tokens. Spelled
 * `flex-start`/`flex-end` rather than the newer `start`/`end`: the bare
 * spellings are correct in flex layout on current engines, but the prefixed
 * ones are what every engine has always accepted, and a layout primitive is
 * the wrong place to spend a compatibility risk.
 */
const KEYWORD_VALUES: Partial<Record<LayoutAttrName, Readonly<Record<string, string>>>> = {
    align: { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' },
    justify: {
        start: 'flex-start', center: 'center', end: 'flex-end',
        between: 'space-between', around: 'space-around', evenly: 'space-evenly',
    },
    wrap: { wrap: 'wrap', nowrap: 'nowrap', 'wrap-reverse': 'wrap-reverse' },
    grow: { 0: '0', 1: '1' },
};

/** The custom property an attribute resolves through. */
const propertyOf = (attr: LayoutAttrName): string => `--l-${attr}`;

/**
 * The declarations one attribute value contributes, or `undefined` when the
 * design system cannot express it — a spacing rung it never declared.
 *
 * An undeclared rung emits NOTHING rather than falling back to a neighbour.
 * `gap="2xl"` against a ramp that stops at `xl` then renders unstyled, which
 * is the contract's declared baseline; quietly substituting a different rung
 * would make two design systems disagree about what the same prop means.
 */
function declarationsFor(
    attr: LayoutAttrName,
    value: string,
    spacing: ReadonlySet<string>,
): Record<string, string> | undefined {
    const property = propertyOf(attr);
    if (SPACE_VALUED.has(attr)) {
        if (value === 'none') {
            // `space` doubles as the spacer's grow switch: a spacer told to
            // take no room is a zero-width fixed spacer, not a flexible one.
            return attr === 'space' ? { [property]: '0', '--l-space-grow': '0' } : { [property]: '0' };
        }
        if (!spacing.has(value)) return undefined;
        const token = `var(--space-${value})`;
        return attr === 'space' ? { [property]: token, '--l-space-grow': '0' } : { [property]: token };
    }
    const keyword = KEYWORD_VALUES[attr]?.[value];
    return keyword === undefined ? undefined : { [property]: keyword };
}

const block = (selector: string, decls: Record<string, string>, indent = ''): string => {
    const body = Object.entries(decls).map(([k, v]) => `${indent}    ${k}: ${v};`).join('\n');
    return `${indent}${selector} {\n${body}\n${indent}}`;
};

/**
 * The step table: attribute value → custom property, for one design system.
 *
 * Emitted through `DesignSystemInput.css`, which lands in `index.css` inside
 * `@layer zero.recipes` — the same layer the scope rules are in, so a skin's
 * own recipe can still override any of it, and an app's unlayered CSS still
 * beats the lot.
 *
 * Breakpoints are emitted in DECLARATION order, which the kit validates as
 * ascending. Within one layer and one specificity the later rule wins, so a
 * descending emission would make the wider breakpoint lose to the narrower.
 */
export function layoutCss(tokens: Pick<TokensInput, 'breakpoints' | 'system'>): string {
    const spacing = new Set(Object.keys(tokens.system?.spacing ?? {}));
    const breakpoints = Object.entries(tokens.breakpoints ?? {});
    const out: string[] = [
        '/* The layout step table — generated by @sigx/zero-kit (layoutCss).',
        '   Scope-agnostic on purpose: `data-l-*` is a namespace zero owns and only',
        '   layout parts carry, the same reasoning that makes the lynx class grammar\'s',
        '   state and flag classes scope-agnostic. The `[data-scope][data-part]` prefix',
        '   is for SPECIFICITY, not for matching — it lifts these to (0,3,0) so they',
        '   beat the (0,2,0) component-token block that declares each default. */',
    ];

    for (const attr of USED_ATTRS) {
        for (const value of layoutAttrSpec(attr).values) {
            const decls = declarationsFor(attr, value, spacing);
            if (!decls) continue;
            out.push(block(`[data-scope][data-part][${LAYOUT_ATTR_PREFIX}${attr}="${value}"]`, decls));
        }
    }

    for (const [name, width] of breakpoints) {
        const rules: string[] = [];
        for (const attr of USED_ATTRS) {
            if (!layoutAttrSpec(attr).responsive) continue;
            for (const value of layoutAttrSpec(attr).values) {
                const decls = declarationsFor(attr, value, spacing);
                if (!decls) continue;
                rules.push(block(`[data-scope][data-part][${LAYOUT_ATTR_PREFIX}${name}-${attr}="${value}"]`, decls, '    '));
            }
        }
        if (rules.length > 0) out.push(`@media (min-width: ${width}) {\n${rules.join('\n')}\n}`);
    }

    return out.join('\n');
}

/**
 * The per-scope vocabulary narrowing every adopting design system needs.
 *
 * Not decoration, and not something the recipes can express. The
 * `axis-coverage` audit rule walks every manifest component that HAS a recipe
 * — not only the ones carrying `WithVariantAxes` — so a styled scope wiring no
 * `color` and no `size` raises two findings per skin. Layout scopes wire
 * neither by design: a Stack is geometry, and `data-color` on it would paint
 * nothing.
 *
 * `[]` is the declared grammar for "there isn't one", as distinct from an
 * absent key meaning "I didn't say". Spread this into a skin's
 * `tokens.scopes` so the waiver is recorded rather than the finding tolerated.
 */
export const layoutScopes: Readonly<Record<string, ScopeVocabulary>> = Object.freeze(
    // Null prototype, like every other scope-keyed map in the kit
    // (`packagesByScope`, `externalScopes`). Scope names take the kebab
    // grammar, which is lowercase — so not `toString`, but `constructor`
    // passes it, and on a plain object a lookup for that one returns
    // something inherited and truthy.
    LAYOUT_SCOPES.reduce<Record<string, ScopeVocabulary>>(
        (acc, scope) => {
            acc[scope] = { colors: [], sizes: [], variants: [] };
            return acc;
        },
        Object.create(null) as Record<string, ScopeVocabulary>,
    ),
);

/**
 * The layout tier's recipes, for one design system.
 *
 * Takes the whole `TokensInput` rather than a narrowed bag so the signature
 * does not change as the pack learns to read more of it.
 */
export function layoutRecipes(_tokens: TokensInput): RecipeInput[] {
    return [stackRecipe(), spacerRecipe()];
}

/**
 * Stack — the flex row/column every application layout is made of.
 *
 * `column-gap`/`row-gap` rather than the `gap` shorthand, and
 * `padding-inline`/`padding-block` rather than `padding`: the two longhands
 * cover the shorthand completely, so writing both would be a redundant
 * declaration whose override order matters. Logical padding also means RTL
 * needs no correction.
 */
function stackRecipe(): RecipeInput {
    return {
        component: 'stack',
        // Declared on the carrier, which is what stops a nested layout part
        // inheriting its parent's spacing — see the module doc.
        tokens: {
            '--l-gap': '0',
            '--l-gap-x': 'var(--l-gap)',
            '--l-gap-y': 'var(--l-gap)',
            '--l-pad': '0',
            '--l-pad-x': 'var(--l-pad)',
            '--l-pad-y': 'var(--l-pad)',
            '--l-align': 'stretch',
            '--l-justify': 'flex-start',
            '--l-wrap': 'nowrap',
        },
        parts: {
            root: {
                base: {
                    display: 'flex',
                    // A flex item defaults to min-width:auto, which refuses to
                    // shrink below its content and is the usual cause of a
                    // nested layout overflowing its parent.
                    minInlineSize: '0',
                    columnGap: 'var(--l-gap-x)',
                    rowGap: 'var(--l-gap-y)',
                    paddingInline: 'var(--l-pad-x)',
                    paddingBlock: 'var(--l-pad-y)',
                    alignItems: 'var(--l-align)',
                    justifyContent: 'var(--l-justify)',
                    flexWrap: 'var(--l-wrap)',
                },
                selectors: {
                    // `Row` and `Col` are the same scope with a different
                    // orientation, so direction reads from the contract
                    // attribute zero already had rather than a new one.
                    '&[data-orientation="horizontal"]': { flexDirection: 'row' },
                    '&[data-orientation="vertical"]': { flexDirection: 'column' },
                },
            },
            item: {
                base: {
                    // Not a carrier, so its default cannot ride in `tokens` —
                    // it is declared here, on the part itself, for the same
                    // anti-inheritance reason.
                    '--l-grow': '0',
                    flexGrow: 'var(--l-grow)',
                    minInlineSize: '0',
                },
            },
        },
    };
}

/**
 * Spacer — flexible by default, fixed when given a `space`.
 *
 * Written as `flex-grow`/`flex-shrink`/`flex-basis` longhands rather than the
 * `flex` shorthand, which the lynx target has to expand by hand because that
 * engine mis-parses it (`targets/lynx/recipe-css.ts`); a shorthand holding a
 * `var()` is not something that expansion could have rewritten.
 *
 * The switch between the two behaviours rides on `--l-space-grow`, which the
 * table sets to `0` alongside every `space` value. Absent, the default `1`
 * makes the spacer take the leftover room.
 */
function spacerRecipe(): RecipeInput {
    return {
        component: 'spacer',
        tokens: {
            '--l-space': '0',
            '--l-space-grow': '1',
        },
        parts: {
            root: {
                base: {
                    flexGrow: 'var(--l-space-grow)',
                    flexShrink: '0',
                    flexBasis: 'var(--l-space)',
                    alignSelf: 'stretch',
                },
            },
        },
    };
}
