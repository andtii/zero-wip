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
 * Whether the platform will synthesize a click from THIS key on THIS
 * element. Components synthesizing keyboard activation for asChild elements
 * skip exactly these cases — doubling a native synthesis would activate
 * twice per press. Per-key because anchors only synthesize on Enter: a
 * role="button" anchor still needs Space supplied by the component.
 */
export function synthesizesClickFrom(target: EventTarget | null, key: string): boolean {
    const tag = target instanceof HTMLElement ? target.tagName : '';
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SUMMARY') return true;
    return tag === 'A' && key === 'Enter';
}
