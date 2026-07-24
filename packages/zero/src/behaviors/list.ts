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

export function createListController(): ListController {
    const registered: ListItem[] = [];

    const items = (): ListItem[] => {
        const withEl = registered.filter((i) => i.el());
        if (withEl.length < 2) return [...registered];
        // Sort a copy by document position; items without elements keep
        // their registration position at the end.
        const sorted = [...withEl].sort((a, b) => {
            const ae = a.el()!, be = b.el()!;
            if (ae === be) return 0;
            return ae.compareDocumentPosition(be) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        const withoutEl = registered.filter((i) => !i.el());
        return [...sorted, ...withoutEl];
    };

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
