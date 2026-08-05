import { defineAnatomy } from '../../contract/anatomy.js';

/**
 * NativeSelect — a real `<select>` in zero anatomy (#333): the form-heavy
 * page workhorse the custom listbox is too heavy for. The platform owns the
 * popup, the keyboard and the a11y tree; zero owns the styleable wrapper.
 *
 * `root` is the carrier (a span, `position: relative` in every recipe) —
 * the variant axes land here, and the chevron overlays it. `control` is the
 * `<select>` itself: with `appearance: none` the native arrow is gone, so
 * the well (border, padding, focus ring) draws on the element and the
 * `indicator` part paints the replacement chevron. No `hidden-input` — the
 * visible element IS the form control and carries `name`, the Input rule.
 *
 * No `data-state` sets: the platform renders the popup, so open/closed never
 * exists in zero's DOM. Everything is flags — including `placeholder`, set
 * while the value is empty AND a `placeholder` prop renders the disabled
 * empty option, which is what lets a recipe gray the resting text without
 * inventing a state for it.
 */
export const nativeSelectAnatomy = defineAnatomy('native-select', {
    root: {
        element: 'span',
        flags: ['disabled', 'invalid', 'required', 'placeholder', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size'],
    },
    control: {
        element: 'select',
        parent: 'root',
        flags: ['disabled', 'invalid', 'required', 'placeholder', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size', 'text'],
    },
    indicator: {
        element: 'span',
        parent: 'root',
        tokens: ['color'],
    },
});
