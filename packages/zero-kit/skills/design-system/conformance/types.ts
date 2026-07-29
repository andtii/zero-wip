/**
 * The row shape of `docs/design-system-conformance.md` (RFC 0003 §7.3).
 *
 * These files are the SOURCE and the document is the rendering — the direction
 * `briefs.test.ts` already established for `SKILL.md`. A row that claims
 * `exact` or `renamed` names an artifact that exists; a row that claims a
 * selector names the exact string the compiler must emit.
 *
 * The rows are not written out. They are DERIVED from two declarations the
 * fixture already has to make:
 *
 *   - `tokens` — what the design system declares, which is what the matrix's
 *     "their vocabulary" column is about;
 *   - `api` — how the vendor's own prop surface maps onto it (#179).
 *
 * So a declared axis cannot be missing a row, and a row cannot describe a
 * mapping the fixture does not implement: they are the same object. Only
 * `unsupported` rows are written by hand, because the absence of a mapping is
 * not derivable from one.
 */

/** RFC 0003 §7.3 column 3. `absent` is the amendment this work proposes. */
export type AxisKind =
    | 'enumeration'
    | 'presence-flag'
    | 'numeric ramp'
    | 'per-component-divergent'
    | 'absent';

/** RFC 0003 §7.3 column 6. */
export type Fidelity = 'exact' | 'renamed' | 'reshaped' | 'unsupported';

/**
 * What stands between a row and `exact` (RFC 0003 §7.3 column 7).
 *
 * A section reference means the difference is a LOCKED DECISION rather than a
 * defect — there is no work to schedule. An issue number means zero cannot
 * paint this today and intends to. A row citing an issue number may not claim
 * `exact`.
 */
export type Gap = '§2' | '§3' | '§4' | number;

/**
 * How one zero axis or modifier is spelled in the vendor's own API.
 *
 * Absent entirely = the vendor spells it exactly as zero does, which is what
 * `exact` means. That is why the common case declares nothing.
 */
export interface AxisApi {
    /** The vendor's prop name, when it differs from zero's. */
    as?: string;
    /**
     * Zero value → the vendor's spelling, where they differ. Needed whenever a
     * vendor value cannot survive `TOKEN_KEY_PATTERN` — Carbon's
     * `danger--tertiary` is the motivating case.
     */
    values?: Record<string, string>;
    /** Overrides the inferred kind. A numeric ramp reads as an enumeration otherwise. */
    kind?: AxisKind;
    /** Overrides the inferred gap. Required when `values` respells anything. */
    gap?: Gap;
    /**
     * The vendor's full vocabulary size, when the fixture declares a sample.
     * Radix has 26 accent colours; six prove the mapping and the rest are token
     * authoring, not contract.
     */
    vendorCount?: number;
    /** One clause justifying the grade. Required unless the row grades `exact`. */
    note?: string;
}

/**
 * The vendor's prop surface, keyed by where it lands in `TokensInput`.
 *
 * Keys mirror the declaration spellings, not the prop spellings, so this reads
 * against `tokens` rather than against zero's component props.
 */
export interface DesignSystemApi {
    roles?: AxisApi;
    sizes?: AxisApi;
    variants?: AxisApi;
    axes?: Record<string, AxisApi>;
    modifiers?: Record<string, AxisApi>;
}

/**
 * An axis surface with no mapping at all — the one grade that cannot be
 * derived, because it is defined by the absence of a declaration.
 *
 * Every one of these must cite a real issue: `unsupported` is reserved for
 * things zero genuinely cannot paint (RFC 0003 §2), so a locked-decision
 * reference would be a category error.
 */
export interface UnsupportedRow {
    /** The vendor's prop name, in their casing. */
    axis: string;
    kind: AxisKind;
    /** Their vocabulary, in their spelling. */
    vocabulary: readonly string[];
    gap: number;
    note: string;
    /**
     * Fragments that must appear in NO emitted CSS — how the row pins its gap.
     * When the gap closes this fails, which is the point: the row, the note and
     * the issue get revisited together rather than the row quietly staying wrong.
     */
    neverEmitted?: readonly string[];
}

export interface ConformanceFixture {
    /** File name, and the compiled design-system name. */
    id: string;
    tier: 1 | 2;
    /** As the vendor writes it — the document's System cell. */
    system: string;
    /** The release graded. */
    release: string;
    /** Versioned documentation URL. */
    source: string;
    /** ISO date a human last read `source` (RFC 0003 §7.4 — no scraping). */
    verified: string;
    /**
     * `'fixture'` when this file's own `tokens` + `button` are the proof, or a
     * repo-relative package path when a shipped package is.
     */
    provenBy: 'fixture' | `packages/${string}`;
    /** One sentence: what this system forces that the others do not. */
    summary: string;
    api: DesignSystemApi;
    unsupported?: readonly UnsupportedRow[];
}
