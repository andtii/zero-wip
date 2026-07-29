/**
 * The vendor-named component API declaration (issue #179, RFC 0003 §2).
 *
 * A design system may declare, beside its tokens and recipes, how zero's axis
 * surfaces appear under the vendor's own prop names — Carbon's `kind`, Ant's
 * `type`, HeroUI's `isIconOnly`. The declaration is data: the kit validates it
 * here, derives the conformance grade from it (`apiGrade`), and — in the build
 * — emits the `./components` artifact from it. Nothing about zero's own
 * components changes: `variant` stays `variant`, the rendered attribute stays
 * `data-variant`, and the playground keeps swapping design systems over the
 * same JSX. The declaration only shapes the *additional*, per-design-system
 * `./components` module.
 *
 * Target-neutral: the conformance fixtures and #174's matrix read the grades
 * from the same objects the web emitter consumes, so a matrix row cannot claim
 * a mapping the artifact doesn't implement — they are the same data.
 */
import { RESERVED_AXES, VARIANT_AXES } from './contract.js';
import type { ValidationIssue } from './resolve/validate.js';

/** How one zero axis surfaces on the vendor-named component module. */
export interface AxisApi {
    /**
     * The vendor prop name (Carbon's `kind`, Ant's `type`). Omitted → the
     * axis surfaces under zero's own name — an explicit `exact` claim,
     * distinct from declaring no mapping at all (`unsupported`).
     *
     * A vendor name may shadow a component-specific prop (Ant's `type` over
     * Button's native `type`) — that is vendor-faithful, and the generated
     * module documents the shadowing. It may NOT take a name zero's contract
     * owns on every component (`variant`, `mods`, `class`, `asChild`, …).
     */
    as?: string;
    /**
     * zero value → vendor spelling, for the values the attribute grammar
     * cannot hold (`'danger-tertiary'` → `'danger--tertiary'`). Injective,
     * and every key must be a declared value of this axis. The rendered
     * attribute keeps the zero spelling — only the prop surface respells.
     */
    values?: Record<string, string>;
}

/** A presence-only modifier surfaced as a vendor boolean prop. */
export interface ModifierApi {
    /**
     * The vendor boolean prop (`hasIconOnly`, `isExpressive`). Omitted → the
     * modifier surfaces under its own name.
     */
    as?: string;
}

/**
 * The whole declaration. `color` and `size` deliberately have no entry — no
 * surveyed design system renames either — and per-component overrides are
 * reserved for a future `components` key (rejected by the validator until it
 * exists, so adding it later is additive rather than silently ignored today).
 */
export interface DesignSystemApi {
    /** The `variant` axis. */
    variant?: AxisApi;
    /** Custom axes (`tokens.axes`): axis name → its surfacing. */
    axes?: Record<string, AxisApi>;
    /** Modifiers (`tokens.modifiers`): modifier name → its surfacing. */
    modifiers?: Record<string, ModifierApi>;
}

/** `AxisApi` with `values` keys narrowed to a declared vocabulary. */
export interface AxisApiFor<Value extends string> {
    as?: string;
    values?: Partial<Record<Value, string>>;
}

/** `DesignSystemApi` narrowed against a declared vocabulary — see `defineApi`. */
export interface DesignSystemApiFor<
    V extends string,
    M extends string,
    A extends Record<string, readonly string[]>,
> {
    variant?: AxisApiFor<V>;
    axes?: { [K in keyof A]?: AxisApiFor<Extract<A[K][number], string>> };
    modifiers?: Partial<Record<M, ModifierApi>>;
}

/**
 * The authoring entry point — identity with typing.
 *
 * The two-argument form narrows the declaration against the vocabulary it
 * maps: `values` keys must be declared variant values, `modifiers` keys
 * declared modifiers, `axes` keys declared axes. Pass the same objects the
 * tokens declare (`defineApi({ variants, modifiers }, { … })`) and mistakes
 * fail at the declaration; a design system whose vocabulary isn't exported
 * as `const` arrays degrades to the one-argument form, where `validateApi`
 * catches the same mistakes at build time instead.
 */
export function defineApi(api: DesignSystemApi): DesignSystemApi;
export function defineApi<
    const V extends readonly string[] = readonly never[],
    const M extends readonly string[] = readonly never[],
    const A extends Record<string, readonly string[]> = Record<never, readonly string[]>,
>(
    vocabulary: { variants?: V; modifiers?: M; axes?: A },
    api: DesignSystemApiFor<V[number] & string, M[number] & string, A>,
): DesignSystemApi;
export function defineApi(first: object, second?: object): DesignSystemApi {
    return (second ?? first) as DesignSystemApi;
}

/** RFC 0003 §7.3 fidelity, derived mechanically from the declaration. */
export type ConformanceGrade = 'exact' | 'renamed' | 'reshaped' | 'unsupported';

/**
 * The grade an axis mapping earns. `unsupported` — the only grade a human
 * still asserts by hand — is simply the absence of a mapping.
 */
export function apiGrade(entry: AxisApi | undefined): ConformanceGrade {
    if (!entry) return 'unsupported';
    if (entry.values && Object.keys(entry.values).length > 0) return 'reshaped';
    if (entry.as) return 'renamed';
    return 'exact';
}

/**
 * A mapped modifier is always `reshaped`: the vendor surface is a boolean
 * prop, zero's is a presence-only attribute — the shape changes even when the
 * name doesn't.
 */
export function modifierGrade(entry: ModifierApi | undefined): ConformanceGrade {
    return entry ? 'reshaped' : 'unsupported';
}

/**
 * A vendor prop name: it becomes a property in the generated
 * `components.d.ts` and a JSX attribute. Kebab-case survives both (JSX
 * attributes may contain dashes), so a modifier surfacing under its own name
 * stays valid; what cannot survive is whitespace, quotes or a leading digit.
 */
export const API_PROP_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$-]*$/;

/**
 * A vendor value spelling: interpolated into a single-quoted literal in the
 * generated `.d.ts` and compared verbatim against the prop at runtime.
 * Deliberately looser than `TOKEN_KEY_PATTERN` — holding the spellings that
 * pattern rejects is the whole point of `values` — but still printable ASCII
 * with no whitespace, quotes or backslashes.
 */
const VENDOR_VALUE_PATTERN = /^[\x21\x23-\x26\x28-\x5b\x5d-\x7e]+$/;

/**
 * Prop names zero's contract owns on every component. Composed from the
 * parity-tested contract constants rather than redeclared — `adapt()` never
 * re-validates (generated artifacts are downstream of this validator, the
 * same trust model `register.js` has), so this set exists only here.
 */
const CONTRACT_PROPS = new Set([
    ...Object.keys(VARIANT_AXES),
    'axes',
    'mods',
    'class',
    'asChild',
    'children',
]);

/** The vocabulary half of `TokensInput` — all `validateApi` needs to read. */
export interface ApiVocabulary {
    variants?: readonly string[];
    modifiers?: readonly string[];
    axes?: Record<string, readonly string[]>;
}

/**
 * Validate a declaration against the vocabulary it maps. Standalone (rather
 * than folded into `validateDesignSystem`) so a conformance fixture can check
 * its api against its own vocabulary without constructing a full design
 * system — the fixture and the validator see the same objects.
 */
export function validateApi(api: DesignSystemApi, vocabulary: ApiVocabulary): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const error = (where: string, message: string) => issues.push({ level: 'error', where, message });
    const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });

    // ── Shape: only the keys this kit understands ──
    // An unknown key is an error, not a skip: a newer declaration read by an
    // older kit must fail loudly rather than silently emit less than it says.
    for (const key of Object.keys(api)) {
        if (key === 'variant' || key === 'axes' || key === 'modifiers') continue;
        error('api', key === 'components'
            ? 'per-component api overrides are not implemented yet (reserved key "components") — declare the mapping at the design-system level'
            : `unknown key "${key}" — the api declares variant, axes and modifiers`);
    }
    const checkEntryKeys = (where: string, entry: object, allowed: readonly string[]): void => {
        for (const key of Object.keys(entry)) {
            if (!allowed.includes(key)) {
                error(where, `unknown key "${key}" — a mapping declares ${allowed.join(' and ')}`);
            }
        }
    };

    // ── Every effective prop, for cross-entry duplicate detection ──
    // An entry without `as` still occupies a prop (its own name): two routes
    // to one prop would leave adapt() unable to say which axis a value is for.
    const propOwners = new Map<string, string>();
    const claim = (where: string, prop: string): void => {
        const owner = propOwners.get(prop);
        if (owner) {
            error('api', `${owner} and ${where} both expose the prop "${prop}" — every vendor prop must route to exactly one axis`);
        } else {
            propOwners.set(prop, where);
        }
    };

    const checkAs = (where: string, as: string, ownName: string): void => {
        if (!API_PROP_PATTERN.test(as)) {
            error(where, `as: "${as}" is not a valid prop name — it becomes a property in the generated components.d.ts`);
            return;
        }
        if (as === ownName) {
            warn(where, `as: "${as}" is the surface's own name — omit \`as\` to surface it unrenamed`);
            return;
        }
        if (Object.hasOwn(VARIANT_AXES, as) || as === 'axes' || as === 'mods') {
            error(where, `as: "${as}" is zero's own prop for an axis — a prop of that name could never route anywhere else`);
        } else if (RESERVED_AXES.has(as)) {
            error(where, `as: "${as}" is part of the anatomy contract — a prop of that name would shadow what zero already renders`);
        } else if (CONTRACT_PROPS.has(as)) {
            error(where, `as: "${as}" is a structural prop on every zero component — the adapter could never forward it`);
        }
    };

    const checkValues = (
        where: string,
        values: Record<string, string>,
        declared: ReadonlySet<string>,
        surface: string,
    ): void => {
        const seenVendor = new Map<string, string>();
        for (const [zero, vendor] of Object.entries(values)) {
            if (!declared.has(zero)) {
                error(where, `values remaps "${zero}", which is not in ${surface} — the adapter can only respell declared values`);
            }
            if (!VENDOR_VALUE_PATTERN.test(vendor)) {
                error(where, `values respells "${zero}" as "${vendor}", which is not a plain printable spelling (no whitespace, quotes or backslashes)`);
                continue;
            }
            if (vendor === zero) {
                warn(where, `values remaps "${zero}" to itself — remove the entry (an untouched value needs no remap)`);
                continue;
            }
            if (declared.has(vendor)) {
                error(where, `values respells "${zero}" as "${vendor}", which is itself a declared value — the vendor union would carry one name with two meanings`);
            }
            const already = seenVendor.get(vendor);
            if (already) {
                error(where, `values maps "${already}" and "${zero}" both to "${vendor}" — the remap must be injective so adapt() can route each vendor value back to one zero value`);
            } else {
                seenVendor.set(vendor, zero);
            }
        }
    };

    // ── variant ──
    if (api.variant) {
        const where = 'api.variant';
        checkEntryKeys(where, api.variant, ['as', 'values']);
        const declared = new Set(vocabulary.variants ?? []);
        if (declared.size === 0) {
            error(where, 'maps the variant axis, but tokens.variants is undeclared — declare the vocabulary so the generated types have a union to narrow');
        }
        if (api.variant.as !== undefined) checkAs(where, api.variant.as, 'variant');
        claim(where, api.variant.as ?? 'variant');
        if (api.variant.values) checkValues(where, api.variant.values, declared, 'tokens.variants');
    }

    // ── custom axes ──
    for (const [axis, entry] of Object.entries(api.axes ?? {})) {
        const where = `api.axes.${axis}`;
        checkEntryKeys(where, entry, ['as', 'values']);
        const declared = vocabulary.axes?.[axis];
        if (!declared) {
            error('api.axes', `"${axis}" is not declared in tokens.axes — declare the axis or remove the mapping`);
        }
        if (entry.as !== undefined) checkAs(where, entry.as, axis);
        claim(where, entry.as ?? axis);
        if (entry.values) checkValues(where, entry.values, new Set(declared ?? []), `tokens.axes.${axis}`);
    }

    // ── modifiers ──
    for (const [name, entry] of Object.entries(api.modifiers ?? {})) {
        const where = `api.modifiers.${name}`;
        checkEntryKeys(where, entry, ['as']);
        if (!(vocabulary.modifiers ?? []).includes(name)) {
            error('api.modifiers', `"${name}" is not declared in tokens.modifiers — declare the modifier or remove the mapping`);
        }
        if (entry.as !== undefined) {
            checkAs(where, entry.as, name);
        } else if (CONTRACT_PROPS.has(name) || RESERVED_AXES.has(name)) {
            // Modifier NAMES live behind the data-mod- prefix, so declaration
            // never checks them against the contract's namespace — but a
            // modifier surfacing as a PROP steps out from behind the prefix.
            error(where, `"${name}" would surface as a prop zero already owns — give it a vendor name with \`as\``);
        }
        claim(where, entry.as ?? name);
    }

    return issues;
}
