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
 * The fourteen were surveyed one at a time against RFC 0003 §7.2's set — the
 * reasons below are the survey — and the result is more uniform than the issue
 * guessed. **Twelve of the fourteen do carry a variant in a real design system.
 * Not one of the twelve spells it `solid | outline | soft | ghost`.**
 *
 * That is §1.1's thesis arriving at its consequence. The four convention design
 * systems declare a BUTTON's vocabulary and declare it design-system-wide, so
 * wiring these carriers means painting `ghost` onto a progress bar — a value
 * its own design language does not have. The honest wiring needs the per-scope
 * restriction map RFC 0003 §4 deferred, and it needs `tokens.variants` to
 * become the union of every scope's vocabulary rather than the button's.
 *
 * So `never` is the correct compiled answer for all fourteen today, and this
 * ledger is the reason it is correct rather than merely absent.
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

    /**
     * The sharpest one. Radix's Select varies BOTH halves and gives them
     * DIFFERENT vocabularies — Trigger `classic | surface | soft | ghost`,
     * Content `solid | soft`. Zero carries `variant` as one attribute on the
     * scope's carrier part, so even §4's per-scope map would not express this:
     * it wants per-PART vocabularies. Recorded here because it is the strongest
     * evidence in the survey that the axis is under-specified, not under-wired.
     */
    select: 'Radix Themes Select varies Trigger as classic | surface | soft | '
        + 'ghost and Content as solid | soft — two vocabularies, one scope.',

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

    // ── Bucket B: no surveyed system varies these at all. The only two where
    //    "no variant here" is the whole answer, and §4 would not change it. ──
    'rating-group': 'no surveyed system varies a rating control — Ant Design\'s '
        + 'Rate has size and character, no style axis.',
    'tree-view': 'no surveyed system varies a tree — Ant Design\'s Tree styles '
        + 'through showLine / blockNode / classNames, not a style axis.',
};

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
                if (declared[axis] && wired[axis].length === 0) gaps.push(`${scope}.${axis}`);
            }
        }
        expect(gaps, `${name} accepts these axes at runtime and wires nothing for them`).toEqual([]);
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
                + 'delete the entry (and check RFC 0003 §4 has actually landed, since the '
                + 'reasons say the vocabulary could not express it)',
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
