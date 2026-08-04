/**
 * The accepts-but-unwired guard.
 *
 * A component that composes `WithVariantAxes` accepts `color` / `size` /
 * `variant` at runtime and renders them as `data-*`. If no design system wires
 * an axis, the attribute matches nothing — and under an opted-in `/register`
 * module the generated type is `never`, so the prop is offered and then
 * rejected. RFC 0002 §4.1 calls that the tier-2 failure; #103 removed it once.
 *
 * It came straight back. NumberInput (#136), RatingGroup (#142) and TreeView
 * (#144) all landed AFTER #103 merged, each carrying the axis props with
 * nothing wired, and nothing failed. That is the gap this file closes: the
 * check is structural, so component #24 cannot reintroduce it quietly.
 *
 * The carrier list is read from the component sources rather than hardcoded,
 * for the same reason: a hardcoded list is one more thing to forget.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDesignSystem } from '@sigx/zero-kit';
import type { ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';
import { designSystem as herouiDS } from '@sigx/zero-heroui';
import { designSystem as carbonDS } from '@sigx/zero-carbon';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

// Resolved from the vitest root, like every other filesystem-reading test
// here: `import.meta.url` is rewritten by the test server and does not hit
// disk (see `schemas.test.ts` and `contract-parity.test.ts`).
const COMPONENTS_DIR = resolve(process.cwd(), 'packages/zero/src/components');

/**
 * Component scopes whose props compose `WithVariantAxes`. The directory name
 * IS the scope (`tree-view`, `number-input`), which the anatomy assertion
 * below pins.
 */
const carriers: string[] = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((entry) => {
        const dir = resolve(COMPONENTS_DIR, entry.name);
        return readdirSync(dir)
            .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
            .some((f) => readFileSync(resolve(dir, f), 'utf8').includes('WithVariantAxes'));
    })
    .map((e) => e.name)
    .sort();

const designSystems = {
    basic: compileDesignSystem(basicDS, manifest),
    daisyui: compileDesignSystem(daisyDS, manifest),
    material: compileDesignSystem(materialDS, manifest),
    brutalist: compileDesignSystem(brutalistDS, manifest),
    heroui: compileDesignSystem(herouiDS, manifest),
    carbon: compileDesignSystem(carbonDS, manifest),
};

/**
 * `variant` is wired on `button` alone, and that is now a DECISION rather than
 * a deferral (#175, discharging RFC 0003 §9 phase 5's gate: "wire it, or record
 * the divergence per component with its reason").
 *
 * The twenty were surveyed one at a time against RFC 0003 §7.2's set — the
 * reasons below are the survey — and the result is more uniform than the issue
 * guessed. **Eighteen of the twenty do carry a variant in a real design
 * system. Not one of the eighteen spells it `solid | outline | soft | ghost`.**
 *
 * That is §1.1's thesis arriving at its consequence. The four convention design
 * systems declare a BUTTON's vocabulary and declare it design-system-wide, so
 * wiring these carriers means painting `ghost` onto a progress bar — a value
 * its own design language does not have.
 *
 * **That blocker is gone (#294).** `tokens.scopes` landed the per-scope
 * restriction map RFC 0003 §4 deferred, and `tokens.variants` is now the union
 * of every scope's vocabulary rather than the button's — so the reasons below
 * no longer say "inexpressible", they say "not declared yet". Wiring any of
 * the fourteen is now a design system's decision, taken one skin at a time,
 * and it costs the recipes plus the contrast audit's ancestor chains
 * (nineteen of the twenty carry their axes on a part that renders no text —
 * `toggle` is the one whose carrier is the text-bearing element itself).
 *
 * `select` LEFT this ledger in #297, and how it left is the template for the
 * rest: zero-basic gives it `outline | soft | ghost` through `tokens.scopes`,
 * and the contrast audit reaches its trigger, value and items through declared
 * `AXIS_CHAINS` rather than the one-element probe that could never see them.
 * The blocker on the other nineteen is now work, not expressiveness.
 *
 * `badge` is deliberately NOT here, and is the reason the ledger is no longer
 * the whole story: zero-basic wires its variant against a vocabulary badge
 * declares for itself (`tokens.scopes`, RFC 0003 §4.1 / #294 / #311). It is
 * the content tier's arrival that §4 said would trigger this, and it could go
 * first because its carrier IS its text-bearing part — the one shape the
 * contrast audit's one-element probe can measure without #297's chains.
 *
 * So `never` is still the correct compiled answer for all twenty today —
 * none of the six declares a vocabulary for them — and this ledger is the
 * reason it is correct rather than merely absent.
 *
 * Sources are the design systems' own prop tables, verified 2026-08-02, in the
 * style `skills/design-system/conformance/*.ts` uses for the same claim.
 */
const NO_VARIANT: Record<string, string> = {
    // ── Radix Themes' form-control family: one vocabulary, seven controls,
    //    and it is not this one. ────────────────────────────────────────────
    checkbox: 'Radix Themes Checkbox varies as classic | surface | soft.',
    switch: 'Radix Themes Switch varies as classic | surface | soft.',
    'radio-group': 'Radix Themes RadioGroup varies as classic | surface | soft.',
    slider: 'Radix Themes Slider varies as classic | surface | soft.',
    progress: 'Radix Themes Progress varies as classic | surface | soft — so '
        + 'the issue\'s guess that a varied progress bar is meaningless is wrong; '
        + 'what is meaningless is a GHOST one.',
    'number-input': 'Radix Themes TextField varies as classic | surface | soft.',
    // The two the entry above was already describing: `number-input`'s cited
    // source IS Radix's text field, so the plain one and its multi-line
    // sibling inherit the same answer rather than a new one.
    input: 'Radix Themes TextField varies as classic | surface | soft.',
    textarea: 'Radix Themes TextArea varies as classic | surface | soft.',

    // ── The rest of bucket A: a variant exists, spelled differently again. ──
    avatar: 'Radix Themes Avatar varies as solid | soft.',
    'toggle-group': 'Radix Themes SegmentedControl varies as surface | classic.',
    combobox: 'Ant Design v6 AutoComplete varies as outlined | borderless | '
        + 'filled | underlined.',
    tabs: 'HeroUI v3 Tabs varies as primary | secondary (filled vs underline '
        + 'indicator); Carbon spells the same split line vs contained.',
    toggle: 'Material 3 makes the toggle a MODE of the icon button rather than '
        + 'a component — all four (standard, filled, filled-tonal, outlined) '
        + 'take `toggle`, so the variant is the button\'s and follows it.',

    // ── The animated pair (#314). Both DO have a style axis somewhere, and
    //    neither is a fill/chrome one — which is §7.2's point twice over. ──
    skeleton: 'Ant Design Skeleton varies as its `active` shimmer vs a static '
        + 'block, and Chakra spells the same split `isLoaded` — a MOTION axis, '
        + 'not a fill one, and zero already carries it as `data-state`.',
    spinner: 'Ant Design Spin varies by `indicator` (the glyph itself is '
        + 'replaceable) and Material spells its two `determinate` and '
        + '`indeterminate` — a shape axis rather than a chrome one.',

    // ── Bucket B: no surveyed system varies these at all. The only two where
    //    "no variant here" is the whole answer, and §4 would not change it. ──
    // ── The content tier (#311). Card and alert have a variant in a surveyed
    //    system and cannot wire it yet: their text sits BELOW a non-text
    //    carrier, which the contrast audit's `axis coverage` guard rejects
    //    until #297 lands the ancestor chains. Divider is bucket B's third.
    card: 'Radix Themes Card varies as surface | classic | ghost.',
    alert: 'Radix Themes Callout varies as soft | surface | outline.',
    divider: 'Ant Design Divider varies as solid | dashed | dotted — a stroke '
        + 'style rather than a fill, which is the axis in a different sense '
        + 'again and exactly §7.2\'s point.',

    'rating-group': 'no surveyed system varies a rating control — Ant Design\'s '
        + 'Rate has size and character, no style axis.',
    'tree-view': 'no surveyed system varies a tree — Ant Design\'s Tree styles '
        + 'through showLine / blockNode / classNames, not a style axis.',

    // ── The Contract v1 carriers (#317 item 4): the eight scopes that had no
    //    axis surface at all. Several DO carry a variant in a surveyed system,
    //    and none of the six skins declares a vocabulary for them yet — the
    //    same "not declared yet" status the rest of this ledger records. ──
    accordion: 'HeroUI v2 Accordion varies as light | shadow | bordered | '
        + 'splitted; no shipped skin declares a vocabulary for it yet (#321).',
    collapsible: 'no surveyed system varies a bare disclosure — the chrome '
        + 'belongs to the accordion it usually composes into.',
    dialog: 'no surveyed system varies a dialog\'s chrome — Radix, HeroUI and '
        + 'Material all size it and leave the surface singular.',
    field: 'no surveyed system varies a form-field wrapper — the variant '
        + 'lives on the control inside it (Radix TextField\'s '
        + 'classic | surface | soft).',
    menu: 'no surveyed system varies a menu — Radix DropdownMenu and HeroUI '
        + 'Dropdown style through the item, not a style axis.',
    popover: 'no surveyed system varies a popover surface.',
    toast: 'Chakra\'s toast varies as solid | subtle | left-accent | '
        + 'top-accent; no shipped skin declares a vocabulary for it yet '
        + '(#321) — colour, its actual axis here, IS wired (toast.color).',
    tooltip: 'Ant Design Tooltip varies by `color`, not a chrome variant; '
        + 'HeroUI colours it through its fused variant, undeclared for '
        + 'tooltip in the shipped skins.',
};

/**
 * (scope, axis) pairs a design system may leave unwired FOR NOW — the
 * ledgered exception to the colour/size rule below, in the same
 * bound-from-both-ends style as `NO_VARIANT`.
 *
 * Every entry here is DEBT with an issue, not a decision. The ledger's one
 * population so far — the Contract v1 carriers' colour and size axes (#317
 * item 4) — emptied when #321 wired all six skins, and the stale check below
 * is what forces that cleanup: an entry outliving its recipes would silently
 * re-open the accepts-but-unwired hole this file exists to close.
 */
const UNWIRED_AXES: Record<string, string> = {};

const CHECKED_AXES = (['color', 'size'] as const);

describe('no component accepts an axis no design system wires', () => {
    it('finds the carriers by reading the component sources', () => {
        // A sanity check on the discovery itself: if this returns nothing, the
        // whole suite would pass vacuously.
        expect(carriers.length).toBeGreaterThan(10);
        expect(carriers).toContain('tree-view');
        expect(carriers).toContain('button');
    });

    it('every carrier is a real anatomy scope', () => {
        const scopes = new Set(manifest.components.map((c) => c.scope));
        for (const carrier of carriers) expect(scopes).toContain(carrier);
    });

    it.each(Object.keys(designSystems))('%s wires colour and size for every carrier it skins', (name) => {
        const compiled = designSystems[name as keyof typeof designSystems];
        // An axis a design system declares OUT of existence is not a gap:
        // `roles: {}` means there is no colour axis to wire, and `sizes: []`
        // means there is no size ramp. Demanding those would make a
        // deliberately colourless design system impossible to ship — and
        // `zero-heroui` is exactly that.
        const declared = {
            color: Object.keys(compiled.tokens.roles).length > 0,
            size: compiled.tokens.sizes.length > 0,
        };
        const gaps: string[] = [];
        for (const scope of carriers) {
            const wired = compiled.components[scope];
            // A carrier with no recipe is a DIFFERENT failure — the validator
            // already warns "will render unstyled" — and conflating the two
            // would make this fail for a reason it was not built to catch.
            if (!wired) continue;
            for (const axis of CHECKED_AXES) {
                if (`${scope}.${axis}` in UNWIRED_AXES) continue;
                if (declared[axis] && wired[axis].length === 0) gaps.push(`${scope}.${axis}`);
            }
        }
        expect(gaps, `${name} accepts these axes at runtime and wires nothing for them`).toEqual([]);
    });

    // The unwired ledger, bound from both ends like NO_VARIANT: an entry must
    // name a real carrier, and it must still be describing a real gap — an
    // entry whose axis every declaring skin now wires is dead weight that
    // would absorb the next regression.
    it('every UNWIRED_AXES entry names a real carrier and axis', () => {
        for (const key of Object.keys(UNWIRED_AXES)) {
            const [scope, axis] = key.split('.') as [string, string];
            expect(carriers, `UNWIRED_AXES: "${scope}" is not a variant-axes carrier`).toContain(scope);
            expect(CHECKED_AXES as readonly string[], `UNWIRED_AXES: "${axis}" is not a checked axis`).toContain(axis);
        }
    });

    it('every UNWIRED_AXES entry still describes a gap in some design system', () => {
        const stale = Object.keys(UNWIRED_AXES).filter((key) => {
            const [scope, axis] = key.split('.') as [string, 'color' | 'size'];
            return !Object.values(designSystems).some((ds) => {
                const declared = axis === 'color'
                    ? Object.keys(ds.tokens.roles).length > 0
                    : ds.tokens.sizes.length > 0;
                const wired = ds.components[scope];
                return declared && wired !== undefined && wired[axis].length === 0;
            });
        });
        expect(
            stale,
            'these axes are now wired by every design system that declares them — delete the entry '
                + '(and close its box on #321), or it silently absorbs the next regression',
        ).toEqual([]);
    });

    // The ledger has to bind from both ends, because the two ways it goes
    // stale are opposite. A carrier can arrive unrecorded (component #24 lands
    // and nobody asks the variant question), or a recorded reason can quietly
    // stop being true (a design system wires the axis and the entry beside it
    // still says nobody does). One assertion per direction, so a failure names
    // which happened.

    // The exemption is "some design system wires it", NOT "is button". Naming
    // button would make the two assertions contradict each other the moment
    // this decision is revisited: wire `select` under RFC 0003 §4, delete its
    // NO_VARIANT entry as the second assertion demands, and a button-shaped
    // exemption would fail the first for a missing entry — leaving no legal
    // state, and a guard whose only escape is to record something false.
    const wiresVariant = (scope: string): boolean =>
        Object.values(designSystems).some((ds) => (ds.components[scope]?.variant.length ?? 0) > 0);

    it('every carrier that wires no variant has a recorded reason', () => {
        const unrecorded = carriers.filter((scope) => !wiresVariant(scope) && !(scope in NO_VARIANT));
        expect(
            unrecorded,
            'these carriers accept `variant` and wire nothing, with no reason recorded — '
                + 'survey the carrier against RFC 0003 §7.2 and add it to NO_VARIANT, or wire it',
        ).toEqual([]);
    });

    it('every recorded reason still describes a carrier that wires nothing', () => {
        const stale = Object.keys(NO_VARIANT).filter((scope) => !carriers.includes(scope));
        expect(stale, 'NO_VARIANT names scopes that are not variant carriers').toEqual([]);

        const wiredAfterAll = Object.keys(NO_VARIANT).filter(wiresVariant);
        expect(
            wiredAfterAll,
            'these carriers now wire `variant`, so the reason recorded beside them is false — '
                + 'delete the entry (and give the scope its own vocabulary in tokens.scopes '
                + 'if the values are not the button\'s: RFC 0003 §4.1)',
        ).toEqual([]);
    });

    it('button still wires a variant in every design system, so the ledger is not vacuous', () => {
        // Without this the two assertions above pass trivially on a repo where
        // NOTHING wires `variant` — a ledger recording a universal absence,
        // which is the failure mode #103 shipped and #168 had to come back for.
        for (const [name, ds] of Object.entries(designSystems)) {
            expect(ds.components['button']?.variant ?? [], `${name} wires no button variant`)
                .not.toEqual([]);
        }
    });
});
