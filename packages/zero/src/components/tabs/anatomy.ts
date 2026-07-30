import { defineAnatomy } from '../../contract/anatomy.js';

export const tabsAnatomy = defineAnatomy('tabs', {
    root: {
        element: 'div',
        tokens: ['color'],
    },
    list: {
        element: 'div',
        tokens: ['color', 'radius-field'],
    },
    tab: {
        element: 'button',
        states: ['active', 'inactive'],
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    panel: {
        element: 'div',
        states: ['active', 'inactive'],
        // The runtime sets `hidden` on every panel but the selected one, so
        // `[data-state="inactive"]` on a panel can never paint.
        hiddenIn: ['inactive'],
        tokens: ['color', 'radius-box', 'text'],
    },
}, { orientation: true });
