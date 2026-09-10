/**
 * Options-array sugar shared by Select, Combobox and NativeSelect (#333).
 *
 * A flat `options` array is the one-liner most form pages want; the
 * components render it through their EXISTING anatomy (Item, and
 * Group/GroupLabel per distinct `group` — or `<option>`/`<optgroup>` for
 * NativeSelect). The grouping walk itself now lives with the collection
 * (`segmentBy`, #443); this is the `OptionInput`-shaped alias the sugar
 * keeps until it becomes `items` (#438).
 */
import { segmentBy } from './collection.js';

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
    return segmentBy(options, (o) => o.group).map((s) => (s.group === undefined ? { options: s.items } : { group: s.group, options: s.items }));
}
