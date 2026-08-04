/**
 * Item registration for compound list components (Tabs, Menu, Select, …).
 *
 * Items register themselves from their setup and unregister on unmount; the
 * container navigates the collection in DOM order. Registration order is the
 * SSR-safe fallback (no DOM on the server); once elements are mounted,
 * `items()` sorts by document position so visual order wins even when items
 * are rendered conditionally or out of order.
 */

export interface ListItem {
    id: string;
    value: string;
    disabled(): boolean;
    el(): HTMLElement | null;
    textValue(): string;
}

export interface ListController {
    /** Register an item; returns the unregister function for onUnmounted. */
    register(item: ListItem): () => void;
    /** All items, DOM-ordered when mounted, registration-ordered otherwise. */
    items(): ListItem[];
    /** Items that are not disabled. */
    enabledItems(): ListItem[];
    /** Find the registered item for a value. */
    find(value: string): ListItem | undefined;
}

/**
 * DOM-order a registered collection: items with mounted elements sort by
 * document position, items without keep registration order at the end
 * (the SSR-safe fallback). Shared by the flat list and the tree.
 */
export function sortByDomOrder<T extends ListItem>(registered: readonly T[]): T[] {
    const withEl = registered.filter((i) => i.el());
    if (withEl.length < 2) return [...registered];
    const sorted = [...withEl].sort((a, b) => {
        const ae = a.el()!, be = b.el()!;
        if (ae === be) return 0;
        return ae.compareDocumentPosition(be) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    const withoutEl = registered.filter((i) => !i.el());
    return [...sorted, ...withoutEl];
}

/** One step of listbox-highlight movement: relative, or straight to an edge. */
export type HighlightStep = 1 | -1 | 'first' | 'last';

/**
 * Move a `highlighted` ref through the enabled items of a list — the shared
 * listbox-highlight step Select and Combobox both drive from their keyboard
 * handlers (previously duplicated byte-for-byte in each). Relative steps
 * clamp at the edges (APG listbox: no wrap).
 */
export function moveHighlight(
    list: ListController,
    highlighted: { value: string | null },
    step: HighlightStep,
): void {
    const items = list.enabledItems();
    if (items.length === 0) return;
    if (step === 'first') { highlighted.value = items[0]!.value; return; }
    if (step === 'last') { highlighted.value = items[items.length - 1]!.value; return; }
    const current = items.findIndex((i) => i.value === highlighted.value);
    const next = Math.min(items.length - 1, Math.max(0, current === -1 ? 0 : current + step));
    highlighted.value = items[next]!.value;
}

/**
 * An option's label text — child text minus decorative parts (the selected
 * `item-indicator` would otherwise leak into the value display and
 * typeahead). Shared by Select and Combobox items.
 */
export function optionText(el: HTMLElement | null): string | undefined {
    if (!el) return undefined;
    let text = '';
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
        else if (node instanceof HTMLElement && node.getAttribute('data-part') !== 'item-indicator') {
            text += node.textContent ?? '';
        }
    }
    const trimmed = text.trim();
    return trimmed === '' ? undefined : trimmed;
}

export function createListController(): ListController {
    const registered: ListItem[] = [];

    const items = (): ListItem[] => sortByDomOrder(registered);

    return {
        register(item) {
            registered.push(item);
            return () => {
                const idx = registered.indexOf(item);
                if (idx !== -1) registered.splice(idx, 1);
            };
        },
        items,
        enabledItems: () => items().filter((i) => !i.disabled()),
        find: (value) => registered.find((i) => i.value === value),
    };
}
