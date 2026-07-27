import { defineAnatomy } from '../../contract/anatomy.js';

export const comboboxAnatomy = defineAnatomy('combobox', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color'],
    },
    // The bordered "field chrome" wrapping input + trigger. It mirrors the
    // input's focus-visible so design systems can draw the ring on the box.
    control: {
        element: 'div',
        states: ['open', 'closed'],
        flags: ['disabled', 'invalid', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size'],
    },
    // A real text input — no data-placeholder flag; use :placeholder-shown.
    input: {
        element: 'input',
        states: ['open', 'closed'],
        flags: ['disabled', 'invalid', 'required', 'readonly', 'focus-visible'],
        tokens: ['color', 'text', 'size'],
    },
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled', 'pressed', 'press-animating', 'focus-visible'],
        tokens: ['color'],
        asChild: true,
    },
    popup: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    item: {
        element: 'div',
        flags: ['selected', 'highlighted', 'disabled', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    'item-indicator': {
        element: 'span',
        flags: ['selected'],
        tokens: ['color'],
    },
    // Rendered by the CONSUMER when their filtered list is empty — zero only
    // styles it, it owns no emptiness logic.
    empty: {
        element: 'div',
        tokens: ['color', 'text'],
    },
    'hidden-input': {
        element: 'input',
    },
});
