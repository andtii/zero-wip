/**
 * Recipe content validation — the mistakes a generator actually makes.
 *
 * Every rule is asserted twice: that it fires on a crafted failure, and that
 * the two shipped design systems still pass. A rule that flags real, correct
 * recipes gets switched off rather than obeyed, so the second half matters as
 * much as the first.
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem, undeclaredAxes, validateDesignSystem } from '@sigx/zero-kit';
import type { CssProps, DesignSystemInput, ManifestComponent, RecipeInput } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

const colors = {
    'base-100': 'oklch(100% 0 0)',
    'base-200': 'oklch(96% 0 0)',
    'base-300': 'oklch(92% 0 0)',
    'base-content': 'oklch(20% 0 0)',
    primary: 'oklch(50% 0.2 260)',
    'primary-content': 'oklch(98% 0.01 260)',
};

/** A design system whose only recipe is the one under test. */
const dsWith = (recipe: RecipeInput): DesignSystemInput => ({
    name: 'probe',
    recipes: [recipe],
    tokens: {
        roles: { primary: {} },
        system: { spacing: { md: '0.5rem' }, motion: { durations: { fast: '120ms' } } },
        custom: { 'glass-blur': { description: 'blur' } },
        defaultLight: 'l',
        themes: { l: { colorScheme: 'light', colors, custom: { 'glass-blur': '12px' } } },
    } as DesignSystemInput['tokens'],
});

/** A tabs recipe that satisfies every other rule, so one thing is tested. */
const tabsWith = (base: CssProps): RecipeInput => ({
    component: 'tabs',
    parts: {
        tab: {
            base,
            states: { 'focus-visible': { outline: '1px solid' } },
        },
    },
});

const check = (recipe: RecipeInput) => {
    const r = validateDesignSystem(dsWith(recipe), manifest);
    return {
        errors: r.errors.map((e) => e.message),
        warnings: r.warnings.map((e) => e.message),
    };
};

describe('token references', () => {
    it('errors on a token the design system never declares', () => {
        expect(check(tabsWith({ color: 'var(--color-brnad)' })).errors)
            .toContainEqual(expect.stringContaining('resolves to nothing'));
    });

    it('suggests the nearest declared token', () => {
        expect(check(tabsWith({ padding: 'var(--spce-md)' })).errors)
            .toContainEqual(expect.stringContaining('did you mean "--space-md"'));
    });

    it('only warns when there is a fallback', () => {
        // `var(--x, 1rem)` renders regardless, so it is the sanctioned way to
        // reference something the app supplies rather than the design system.
        const { errors, warnings } = check(tabsWith({ padding: 'var(--app-gutter, 1rem)' }));
        expect(errors).toEqual([]);
        expect(warnings).toContainEqual(expect.stringContaining('has a fallback'));
    });

    it('accepts every kind of token the design system does declare', () => {
        expect(check(tabsWith({
            color: 'var(--color-primary-content)',        // derived from a role
            background: 'var(--color-primary-soft)',      // derived tint
            padding: 'var(--space-md)',                   // declared category key
            borderRadius: 'var(--radius-box)',            // base.css fallback key
            backdropFilter: 'blur(var(--glass-blur))',    // declared custom token
        })).errors).toEqual([]);
    });

    it('accepts a component token the recipe itself declares', () => {
        expect(check({
            component: 'switch',
            tokens: { '--switch-width': '3rem' },
            parts: {
                control: {
                    base: { width: 'var(--switch-width)' },
                    states: { 'focus-visible': { outline: '1px solid' } },
                },
            },
            skipStates: { root: ['focus-visible'] },
        }).errors).toEqual([]);
    });

    it('looks inside nested functions and conditional styles', () => {
        expect(check({
            component: 'tabs',
            parts: {
                tab: {
                    states: { 'focus-visible': { outline: '1px solid' } },
                    at: {
                        'reduced-motion': {
                            base: { color: 'color-mix(in oklab, var(--color-ghost) 50%, transparent)' },
                        },
                    },
                },
            },
        }).errors).toContainEqual(expect.stringContaining('--color-ghost'));
    });
});

describe('hardcoded values', () => {
    it('warns on a palette color', () => {
        expect(check(tabsWith({ background: '#3b82f6' })).warnings)
            .toContainEqual(expect.stringContaining('hardcodes the color'));
    });

    it('allows achromatic-with-alpha, which is a shadow or scrim', () => {
        // Every raw color in both shipped design systems is of this shape.
        // Without the exemption the rule would flag them all and get disabled.
        expect(check(tabsWith({ boxShadow: '0 1px 2px oklch(0% 0 0 / 0.25)' })).warnings)
            .not.toContainEqual(expect.stringContaining('hardcodes the color'));
    });

    it('does not mistake quoted content for a color', () => {
        expect(check(tabsWith({ content: '"#hashtag"' })).warnings)
            .not.toContainEqual(expect.stringContaining('hardcodes the color'));
    });

    it('warns on a literal transition duration', () => {
        // Reduced motion only collapses var(--duration-*), so a literal opts
        // the rule out of the preference entirely.
        expect(check(tabsWith({ transition: 'background 0.2s ease' })).warnings)
            .toContainEqual(expect.stringContaining('literal duration'));
    });

    it('leaves a tokenized transition alone', () => {
        expect(check(tabsWith({ transition: 'background var(--duration-fast) ease' })).warnings)
            .not.toContainEqual(expect.stringContaining('literal duration'));
    });
});

describe('coverage', () => {
    it('warns about components with no recipe at all', () => {
        expect(check(tabsWith({ color: 'var(--color-primary)' })).warnings)
            .toContainEqual(expect.stringContaining('have no recipe and will render unstyled'));
    });

    it('errors when a component styles focus-visible nowhere', () => {
        expect(check({ component: 'tabs', parts: { tab: { base: { color: 'red' } } } }).errors)
            .toContainEqual(expect.stringContaining('keyboard focus is invisible'));
    });

    it('accepts a part delegating its ring, when declared', () => {
        const { errors, warnings } = check({
            component: 'switch',
            parts: {
                root: { base: { display: 'inline-flex' } },
                control: { states: { 'focus-visible': { outline: '1px solid' } } },
            },
            skipStates: { root: ['focus-visible'] },
        });
        expect(errors).toEqual([]);
        expect(warnings).not.toContainEqual(expect.stringContaining('does not style it'));
    });

    it('errors on a skipStates entry naming nothing real', () => {
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            skipStates: { tab: ['levitating'] },
        }).errors).toContainEqual(expect.stringContaining('neither a state nor a flag'));
    });

    it('accepts a skipStates entry naming a flag', () => {
        // `invalid` and `required` are flags, not machine states. The old
        // check looked only at states, so entries like this were dead config.
        expect(check({
            component: 'field',
            parts: { label: { base: { fontWeight: '600' } } },
            skipStates: { label: ['invalid', 'required'] },
        }).errors).toEqual([]);
    });
});

describe('variants', () => {
    it('accepts an axis beyond the three with named props', () => {
        // `density` used to warn that no zero component could ever set
        // `data-density`, which was true and made a fourth axis impossible.
        // Zero's `axes` prop sets it now, so the axis is legitimate and must
        // pass clean.
        const { errors, warnings } = check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { density: { tight: { tab: { base: { padding: '0' } } } } },
        });
        expect(errors).toEqual([]);
        expect(warnings.filter((w) => w.includes('density'))).toEqual([]);
    });

    it('errors on an axis that shadows the anatomy contract', () => {
        // `data-state` from userland would make every [data-state="open"]
        // rule in the design system match the wrong thing, silently.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { state: { open: { tab: { base: { padding: '0' } } } } },
        }).errors).toContainEqual(expect.stringContaining('part of the anatomy contract'));

        // Flags are reserved too, not just the structural four.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { disabled: { yes: { tab: { base: { padding: '0' } } } } },
        }).errors).toContainEqual(expect.stringContaining('part of the anatomy contract'));
    });

    it('errors on an axis named after an Object.prototype member', () => {
        // `in` would once have reported these as valid contract axes. They are
        // now caught as not-kebab-case, and `RESERVED_AXES` is a Set, so a
        // prototype member is not silently "reserved" either.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { toString: { x: { tab: { base: { padding: '0' } } } } },
        }).errors).toContainEqual(expect.stringContaining('not a kebab-case identifier'));
    });

    it('errors on a variant value that would break out of its selector', () => {
        // The axis vocabularies are open, so "open" has to stop at what can
        // be an attribute value. This one closes the selector early and
        // appends a second, unrelated one — the styles would land on every
        // tab inside any panel, which no recipe asked for.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { size: { 'x"], [data-part="panel': { tab: { base: { color: 'red' } } } } },
        }).errors).toContainEqual(expect.stringContaining('not a kebab-case identifier'));
    });

    it('errors on an axis NAME that would break out of its selector', () => {
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { 'x="y"], [data-part="panel': { a: { tab: { base: { color: 'red' } } } } },
        }).errors).toContainEqual(expect.stringContaining('not a kebab-case identifier'));
    });

    it('errors on a compound-variant match keyed on a reserved axis', () => {
        // Same rule as `variants`: `match: { pressed: … }` compiles to
        // `[data-pressed="…"]`, which never matches a presence-only flag —
        // dead CSS minted silently.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            compoundVariants: [{
                match: { pressed: 'yes' },
                parts: { tab: { base: { color: 'red' } } },
            }],
        }).errors).toContainEqual(expect.stringContaining('part of the anatomy contract'));
    });

    it('errors on a compound-variant match value that would break out', () => {
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            compoundVariants: [{
                match: { size: 'x"], [data-part="panel' },
                parts: { tab: { base: { color: 'red' } } },
            }],
        }).errors).toContainEqual(expect.stringContaining('not a kebab-case identifier'));
    });

    it('errors on a component token spelled without the leading --', () => {
        // `recipe.tokens` is emitted verbatim onto the carrier part, so a
        // forgotten `--` does not define a token — it emits `color: red` on
        // every carrier element of the component, silently.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            tokens: { color: 'red' },
        }).errors).toContainEqual(expect.stringContaining('must be spelled --like-this'));
    });

    it('errors on a component token that is not kebab-case', () => {
        // `--Tabs_Accent` is legal CSS and still wrong: every other declared
        // name in a design system is kebab-case, and a token whose spelling
        // nobody can predict is one nothing else will reference.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            tokens: { '--Tabs_Accent': 'red' },
        }).errors).toContainEqual(expect.stringContaining('is not kebab-case'));
    });

    it('accepts a properly spelled component token', () => {
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            tokens: { '--tabs-accent': 'var(--color-primary)' },
        }).errors).not.toContainEqual(expect.stringContaining('must be spelled --like-this'));
    });

    it('errors on a compound matching an axis the recipe never wires', () => {
        // A compound REFINES single-axis rules. The generated types harvest
        // compound match values into the axis union, so an axis reachable only
        // through a compound type-checks on its own and then matches nothing.
        expect(check({
            component: 'tabs',
            parts: {
                root: { base: { display: 'flex' } },
                tab: { states: { 'focus-visible': { outline: '1px solid' } } },
            },
            compoundVariants: [{
                match: { color: 'primary' },
                parts: { tab: { base: { color: 'red' } } },
            }],
        }).errors).toContainEqual(expect.stringContaining('never wires it in `variants`'));
    });

    it('warns on a compound refining a value the axis wires no rule for', () => {
        // Weaker than the rule above: the axis IS wired, so it is not offered
        // wholesale unstyled — only this one value styles nothing on its own.
        expect(check({
            component: 'tabs',
            parts: {
                root: { base: { display: 'flex' } },
                tab: { states: { 'focus-visible': { outline: '1px solid' } } },
            },
            variants: { size: { md: { tab: { base: { fontSize: '1rem' } } } } },
            compoundVariants: [{
                match: { size: 'lg' },
                parts: { tab: { base: { color: 'red' } } },
            }],
        }).warnings).toContainEqual(expect.stringContaining('the combination styles it, the value alone does not'));
    });

    it('errors on a colour value that names no declared role', () => {
        // `data-color` passes through verbatim, so the selector is emitted and
        // simply never matches — dead CSS with no diagnostic. The probe design
        // system declares only `primary`.
        //
        // `brnad` is misspelled ON PURPOSE: a typo is the mistake this rule
        // exists to catch, and it is what a generator actually produces. A
        // plausible name like `brand` would read as a role someone meant to
        // declare — a different bug with a different fix.
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { color: { brnad: { tab: { base: { color: 'red' } } } } },
        }).errors).toContainEqual(expect.stringContaining('is not a declared role'));
    });

    it('warns when one component wires fewer roles than its siblings', () => {
        // The daisyUI bug this rule was written for: Button looped every role
        // while Tabs wired only `primary`, so `<Tabs.Root color="success">`
        // type-checked, emitted data-color, and matched nothing.
        const twoRoles = (name: string, wired: string[]): RecipeInput => ({
            component: name,
            parts: { root: { base: { padding: '0' } } },
            variants: Object.fromEntries([['color', Object.fromEntries(
                wired.map((r) => [r, { root: { base: { color: `var(--color-${r})` } } }]),
            )]]),
        });
        const ds = dsWith(twoRoles('button', ['primary', 'accent']));
        ds.recipes.push(twoRoles('progress', ['primary']));
        ds.tokens.roles = { primary: {}, accent: {} } as DesignSystemInput['tokens']['roles'];
        ds.tokens.themes.l!.colors = {
            ...colors, accent: 'oklch(50% 0.2 30)', 'accent-content': 'oklch(98% 0.01 30)',
        } as DesignSystemInput['tokens']['themes'][string]['colors'];

        const warnings = validateDesignSystem(ds, manifest).warnings.map((w) => w.message);
        expect(warnings).toContainEqual(expect.stringContaining('color="accent" renders as the default here'));
        // …and the component that wires everything is not itself flagged.
        expect(warnings.filter((w) => w.includes('renders as the default here'))).toHaveLength(1);
    });

    it('warns on a size outside the design system\'s ramp', () => {
        expect(check({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { size: { '2xl': { tab: { base: { padding: '2rem' } } } } },
        }).warnings).toContainEqual(expect.stringContaining("not on this design system's size ramp"));
    });

    it('accepts a size the design system declared, however it is spelled', () => {
        // The point of `tokens.sizes`: a design system whose ramp is Material
        // density steps is checked against ITS ramp, not against xs–xl. Before
        // this, every step of such a ramp was warned on.
        const ds = dsWith({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: {
                size: {
                    compact: { tab: { base: { padding: '0.25rem' } } },
                    comfortable: { tab: { base: { padding: '0.75rem' } } },
                },
            },
        });
        ds.tokens.sizes = ['compact', 'comfortable'];
        const warnings = validateDesignSystem(ds, manifest).warnings.map((w) => w.message);
        expect(warnings).not.toContainEqual(expect.stringContaining('size ramp'));

        // …and the declaration is a real constraint, not just a widening:
        // `md` is off a Material ramp, and because the ramp was EXPLICITLY
        // declared the set is closed — an off-ramp value is an error, where
        // the default recommended ramp only warns (the author never wrote
        // that set down, so a step outside it may be deliberate).
        const off = dsWith({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { size: { md: { tab: { base: { padding: '0.5rem' } } } } },
        });
        off.tokens.sizes = ['compact', 'comfortable'];
        expect(validateDesignSystem(off, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining("not on this design system's declared size ramp"));
    });

    it('errors on variants for a component with no root part', () => {
        // dialog/popover/tooltip/menu render no root element, so the carrier
        // falls back to `trigger` and the descendant selectors never match —
        // the rules compile to dead CSS.
        expect(check({
            component: 'dialog',
            parts: { trigger: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { color: { primary: { popup: { base: { borderColor: 'var(--color-primary)' } } } } },
        }).errors).toContainEqual(expect.stringContaining('no "root" part'));
    });
});

describe('the shipped design systems', () => {
    it.each([
        ['basic', basicDS],
        ['daisyui', daisyDS],
    ] as const)('%s passes every content rule', (_name, ds) => {
        const result = validateDesignSystem(ds, manifest);
        expect(result.errors).toEqual([]);
        // No content warnings either — the rules are calibrated against real
        // recipes, not only against crafted failures.
        const content = result.warnings.filter((w) => w.where.startsWith('recipes'));
        expect(content.map((w) => `${w.where}: ${w.message}`)).toEqual([]);
    });
});

describe('declared axis vocabularies (RFC 0002 phase 1)', () => {
    const tabsVariant = (values: Record<string, string>): RecipeInput => ({
        component: 'tabs',
        parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
        variants: {
            variant: Object.fromEntries(Object.entries(values).map(([v, pad]) => [
                v, { tab: { base: { padding: pad } } },
            ])),
        },
    });

    it('leaves variant values unchecked while tokens.variants is undeclared', () => {
        // Today's behaviour, preserved exactly: absence is never an error.
        const { errors, warnings } = check(tabsVariant({ ghots: '0' }));
        expect(errors).toEqual([]);
        expect(warnings.filter((w) => w.includes('ghots'))).toEqual([]);
    });

    it('errors on a variant value outside the declared list, listing the set', () => {
        const ds = dsWith(tabsVariant({ ghots: '0' }));
        ds.tokens.variants = ['solid', 'ghost'];
        expect(validateDesignSystem(ds, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('"ghots" is not a declared variant (solid, ghost)'));
    });

    it('accepts declared variant values, and warns on a declared value nothing wires', () => {
        const ds = dsWith(tabsVariant({ solid: '0', ghost: '1px' }));
        ds.tokens.variants = ['solid', 'ghost', 'outline'];
        const result = validateDesignSystem(ds, manifest);
        expect(result.errors).toEqual([]);
        expect(result.warnings.map((w) => w.message))
            .toContainEqual(expect.stringContaining('"outline" is declared but no recipe wires it'));
    });

    it('closes the custom-axis set once tokens.axes is declared', () => {
        const density = (value: string): RecipeInput => ({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { density: { [value]: { tab: { base: { padding: '0' } } } } },
        });

        const wrongValue = dsWith(density('tigth'));
        wrongValue.tokens.axes = { density: ['tight', 'loose'] };
        expect(validateDesignSystem(wrongValue, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('"tigth" is not a declared value of axis "density" (tight, loose)'));

        // A whole axis outside the declaration is the same mistake one level up.
        const wrongAxis = dsWith(density('tight'));
        wrongAxis.tokens.axes = { emphasis: ['high', 'low'] };
        expect(validateDesignSystem(wrongAxis, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('axis "density" is not declared in tokens.axes'));

        const ok = dsWith(density('tight'));
        ok.tokens.axes = { density: ['tight', 'loose'] };
        const result = validateDesignSystem(ok, manifest);
        expect(result.errors).toEqual([]);
        expect(result.warnings.map((w) => w.message))
            .toContainEqual(expect.stringContaining('"loose" is declared but no recipe wires it'));
    });

    it('accepts sizes: [] as "this design system has no size axis"', () => {
        // The same claim `roles: {}` already makes about colour. Omitting
        // `sizes` still takes the recommended ramp, so absence ("I didn't
        // say") and empty ("there isn't one") are different statements.
        const noSizes = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        noSizes.tokens.sizes = [];
        expect(validateDesignSystem(noSizes, manifest).errors).toEqual([]);
    });

    it('errors when a recipe wires size under sizes: []', () => {
        const noSizes = dsWith({
            component: 'tabs',
            parts: {
                root: { base: { display: 'flex' } },
                tab: { states: { 'focus-visible': { outline: '1px solid' } } },
            },
            variants: { size: { md: { tab: { base: { fontSize: '1rem' } } } } },
        });
        noSizes.tokens.sizes = [];
        expect(validateDesignSystem(noSizes, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('declares no size axis'));
    });

    it('validates variants/axes declarations: kebab-case, no duplicates', () => {
        const clean = (): DesignSystemInput => dsWith(tabsWith({ color: 'var(--color-primary)' }));

        const dupes = clean();
        dupes.tokens.variants = ['solid', 'solid'];
        expect(validateDesignSystem(dupes, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('duplicate entries'));

        const badCase = clean();
        badCase.tokens.axes = { density: ['Not Kebab'] };
        expect(validateDesignSystem(badCase, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('not a valid axis value'));
    });

    // `variants: []` is the claim `roles: {}` and `sizes: []` already make: not
    // "I declared nothing", but "there is no such axis" (#200).
    it('accepts variants: [] and reports the axis as declared out of existence', () => {
        const noVariants = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        noVariants.tokens.variants = [];
        expect(validateDesignSystem(noVariants, manifest).errors).toEqual([]);
        expect([...undeclaredAxes(compileDesignSystem(noVariants, manifest))]).toContain('variant');
    });

    // …and omitting the key is the OTHER statement. There is no default variant
    // vocabulary, so both spellings compile to `[]` and only the explicit one
    // may be read as absence.
    it('does not treat an omitted variants declaration as an absent axis', () => {
        const undeclared = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        delete undeclared.tokens.variants;
        expect([...undeclaredAxes(compileDesignSystem(undeclared, manifest))]).not.toContain('variant');
    });

    // A custom axis exists because it was named, so an empty one cannot mean
    // "no such axis" — there is no named prop to switch off.
    it('still errors on an empty custom axis', () => {
        const emptyAxis = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        emptyAxis.tokens.axes = { density: [] };
        expect(validateDesignSystem(emptyAxis, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('declared but empty'));
    });

    // #198: a value only ever lands inside a quoted attribute selector, so the
    // token-key grammar was over-strict. Carbon and Radix hit this independently.
    it('accepts axis values a token key could not spell', () => {
        const carbonish = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        carbonish.tokens.variants = ['danger--tertiary', 'danger--ghost'];
        carbonish.tokens.sizes = ['1', '2'];
        expect(validateDesignSystem(carbonish, manifest).errors).toEqual([]);
    });

    // Names are not values: they become an attribute name or a custom-property
    // tail, so they keep the stricter grammar.
    it('still holds names to the kebab-case grammar', () => {
        const badMod = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        badMod.tokens.modifiers = ['high--contrast'];
        expect(validateDesignSystem(badMod, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('not a kebab-case identifier'));

        const badAxisName = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        badAxisName.tokens.axes = { 'den--sity': ['compact'] };
        expect(validateDesignSystem(badAxisName, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('not a kebab-case identifier'));
    });

    it('rejects axis names the runtime refuses to render', () => {
        const ds = dsWith(tabsWith({ color: 'var(--color-primary)' }));
        ds.tokens.axes = { variant: ['solid'], pressed: ['yes'] };
        const errors = validateDesignSystem(ds, manifest).errors.map((e) => e.message);
        expect(errors).toContainEqual(expect.stringContaining('"variant" already has a named prop'));
        expect(errors).toContainEqual(expect.stringContaining('"pressed" is part of the anatomy contract'));
    });

    it('errors on defaultVariants selecting outside what the recipe wires — no declaration needed', () => {
        const typo = tabsVariant({ solid: '0', ghost: '1px' });
        typo.defaultVariants = { variant: 'ghots' };
        expect(check(typo).errors)
            .toContainEqual(expect.stringContaining('"ghots" is not a value this recipe wires for "variant" (solid, ghost)'));

        const unwiredAxis = tabsVariant({ solid: '0' });
        unwiredAxis.defaultVariants = { color: 'primary' };
        expect(check(unwiredAxis).errors)
            .toContainEqual(expect.stringContaining('"color" names an axis this recipe does not wire'));
    });
});

describe('the declared vocabulary closes the set in every shipped design system (phase 1 gate)', () => {
    it.each<[string, DesignSystemInput]>([
        ['basic', basicDS as DesignSystemInput],
        ['daisyui', daisyDS as DesignSystemInput],
        ['material', materialDS as DesignSystemInput],
        ['brutalist', brutalistDS as DesignSystemInput],
    ])('%s: a seeded variants.variant typo and a defaultVariants typo both error', (_name, ds) => {
        // Seed a typo'd variant VALUE into the real button recipe.
        const seeded = structuredClone(ds) as DesignSystemInput;
        const button = seeded.recipes.find((r) => r.component === 'button')!;
        const variantAxis = button.variants!['variant']!;
        variantAxis['ghots'] = variantAxis['ghost']!;
        delete variantAxis['ghost'];
        expect(validateDesignSystem(seeded, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('"ghots" is not a declared variant'));

        // Seed a typo'd DEFAULT — previously a silent no-op.
        const defaulted = structuredClone(ds) as DesignSystemInput;
        const button2 = defaulted.recipes.find((r) => r.component === 'button')!;
        button2.defaultVariants = { ...button2.defaultVariants, variant: 'ghots' };
        expect(validateDesignSystem(defaulted, manifest).errors.map((e) => e.message))
            .toContainEqual(expect.stringContaining('"ghots" is not a value this recipe wires for "variant"'));
    });

    it.each<[string, DesignSystemInput]>([
        ['material', materialDS as DesignSystemInput],
        ['brutalist', brutalistDS as DesignSystemInput],
    ])('%s passes every content rule with its vocabulary declared', (_name, ds) => {
        // basic and daisyui are covered above; these two prove the declaration
        // is clean across the whole matrix, material's 13 roles included.
        expect(validateDesignSystem(ds, manifest).errors).toEqual([]);
    });
});

describe('focus-visible must actually style something', () => {
    it('rejects an empty focus-visible block', () => {
        // `{}` is the "deliberately covered, no styling" idiom used all over
        // these recipes, so accepting it here would let the rule pass while
        // the ring is genuinely missing.
        expect(check({
            component: 'tabs',
            parts: { tab: { base: { color: 'var(--color-primary)' }, states: { 'focus-visible': {} } } },
        }).errors).toContainEqual(expect.stringContaining('keyboard focus is invisible'));
    });

    it('accepts a focus-visible block declared under a condition', () => {
        expect(check({
            component: 'tabs',
            parts: {
                tab: { at: { 'forced-colors': { states: { 'focus-visible': { outline: '2px solid' } } } } },
            },
        }).errors).toEqual([]);
    });
});

describe('var() stripping', () => {
    it('handles a fallback that contains a function', () => {
        // `var(--x, color-mix(…))` — scanning to the first ")" cuts this in
        // half and leaves fragments that can read as literals.
        const { warnings } = check(tabsWith({
            background: 'var(--color-primary, color-mix(in oklab, var(--color-base-100) 50%, transparent))',
        }));
        expect(warnings).not.toContainEqual(expect.stringContaining('hardcodes the color'));
    });

    it('still sees a literal sitting outside the var()', () => {
        expect(check(tabsWith({
            background: 'linear-gradient(var(--color-primary), #3b82f6)',
        })).warnings).toContainEqual(expect.stringContaining('#3b82f6'));
    });
});

describe('diagnostic paths', () => {
    it('point at the real location in the recipe', () => {
        // `where` is what an author (or a generator) navigates by, so it has
        // to match the shape they actually wrote.
        const r = validateDesignSystem(dsWith({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            compoundVariants: [
                { match: { color: 'primary' }, parts: { tab: { base: { color: 'var(--nope)' } } } },
            ],
        }), manifest);
        expect(r.errors.map((e) => e.where)).toContainEqual(
            'recipes.tabs.compoundVariants[0].parts.tab.base',
        );
    });

    it('point into a conditional block', () => {
        const r = validateDesignSystem(dsWith({
            component: 'tabs',
            parts: {
                tab: {
                    states: { 'focus-visible': { outline: '1px solid' } },
                    at: { 'reduced-motion': { base: { color: 'var(--nope)' } } },
                },
            },
        }), manifest);
        expect(r.errors.map((e) => e.where)).toContainEqual(
            'recipes.tabs.parts.tab.at["reduced-motion"].base',
        );
    });
});

describe('press feedback', () => {
    it('accepts the runtime-published --press-* properties', () => {
        // The zero runtime writes these on the element at press time; no
        // design system declares them, and they must not read as typos.
        const { errors, warnings } = check(tabsWith({
            left: 'var(--press-x, 50%)',
            width: 'calc(var(--press-r) * 2)',
        }));
        expect(errors).toEqual([]);
        expect(warnings).not.toContainEqual(expect.stringContaining('--press-'));
    });

    const rippleButton = (afterProps: CssProps): RecipeInput => ({
        component: 'button',
        parts: {
            root: {
                states: { 'focus-visible': { outline: '1px solid' } },
                selectors: { '&[data-press-animating]::after': afterProps },
            },
        },
    });

    it('warns when press-animating is targeted but nothing animates', () => {
        // The runtime clears the flag as soon as no animation runs, so the
        // rule matches for zero frames — dead on arrival.
        expect(check(rippleButton({ opacity: '0.5' })).warnings)
            .toContainEqual(expect.stringContaining('never sets an animation'));
    });

    it('accepts press-animating with an animation', () => {
        expect(check(rippleButton({ animation: 'ripple var(--duration-fast) linear' })).warnings)
            .not.toContainEqual(expect.stringContaining('never sets an animation'));
    });

    it('warns when the only "animation" on a press-animating gate is none', () => {
        expect(check(rippleButton({ animation: 'none' })).warnings)
            .toContainEqual(expect.stringContaining('never sets an animation'));
    });

    it('does not treat a negated selector as a press-animating gate', () => {
        // `:not([data-press-animating])` styles the flag's absence; no
        // animation is expected there.
        expect(check({
            component: 'button',
            parts: {
                root: {
                    states: { 'focus-visible': { outline: '1px solid' } },
                    selectors: { '&:not([data-press-animating])::after': { opacity: '0' } },
                },
            },
        }).warnings).not.toContainEqual(expect.stringContaining('never sets an animation'));
    });

    it('does not mistake a variant value for a press-animating gate', () => {
        // The match is structural — a states block or a
        // `[data-press-animating]` selector — not a substring of the
        // diagnostic path, which a weird-but-legal axis vocabulary can echo.
        expect(check({
            component: 'button',
            parts: { root: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: {
                mode: { 'press-animating': { root: { base: { opacity: '0.5' } } } },
            },
            defaultVariants: { mode: 'press-animating' },
        }).warnings).not.toContainEqual(expect.stringContaining('never sets an animation'));
    });
});
