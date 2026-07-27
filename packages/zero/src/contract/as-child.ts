/**
 * asChild rendering helper.
 *
 * Sigx passes function children through uncalled (scoped slots are normally
 * provided via the `slots` prop, which DOES receive scoped props). asChild
 * supports both spellings:
 *
 * ```tsx
 * <Tabs.Tab value="a" asChild>{(p) => <a href="#a" {...p}>A</a>}</Tabs.Tab>
 * <Tabs.Tab value="a" asChild slots={{ default: (p) => <a {...p}>A</a> }} />
 * ```
 */
import type { PartProps } from './props.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlotAccessor = ((scopedProps?: any) => any) | undefined;

export function renderAsChild(slot: SlotAccessor, bag: PartProps): unknown {
    const out = slot?.(bag);
    if (out == null) return null;
    const items = Array.isArray(out) ? out : [out];
    const rendered = items.map((item) => (typeof item === 'function' ? item(bag) : item));
    return rendered.length === 1 ? rendered[0] : rendered;
}

/**
 * Elements the platform already activates from Enter/Space (synthesizing a
 * click). Components that synthesize keyboard activation for asChild
 * elements skip these — synthesizing on top of the native click would
 * activate twice per key press.
 */
export function isNativelyActivatable(target: EventTarget | null): boolean {
    const tag = target instanceof HTMLElement ? target.tagName : '';
    return tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SUMMARY';
}
