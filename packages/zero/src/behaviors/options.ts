/**
 * Options-array sugar shared by Select, Combobox and NativeSelect (#333).
 *
 * A flat `options` array is the one-liner most form pages want; the
 * components render it through their EXISTING anatomy (Item, and
 * Group/GroupLabel per distinct `group` — or `<option>`/`<optgroup>` for
 * NativeSelect). This module owns the one non-trivial part, the grouping
 * walk, so three components cannot drift on its semantics.
 */

/** One entry of an `options` array. `label` defaults to `value`. */
export interface OptionInput {
    value: string;
    label?: string;
    disabled?: boolean;
    /** Grouped options render inside a Group/optgroup named by this text. */
    group?: string;
}

/**
 * A run of options rendered together: either one ungrouped option
 * (`group` undefined) or every option of one named group.
 */
export interface OptionSegment {
    group?: string;
    options: OptionInput[];
}

/**
 * Fold an options array into render segments, preserving first-appearance
 * order: each distinct `group` becomes one segment at the position its first
 * member appeared, collecting every later member (contiguous or not);
 * ungrouped options keep their own positions as single-option segments.
 */
export function segmentOptions(options: ReadonlyArray<OptionInput>): OptionSegment[] {
    const segments: OptionSegment[] = [];
    const byGroup = new Map<string, OptionSegment>();
    for (const option of options) {
        if (option.group === undefined) {
            segments.push({ options: [option] });
            continue;
        }
        let segment = byGroup.get(option.group);
        if (!segment) {
            segment = { group: option.group, options: [] };
            byGroup.set(option.group, segment);
            segments.push(segment);
        }
        segment.options.push(option);
    }
    return segments;
}
