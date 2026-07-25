import { defineAnatomy } from '../../contract/anatomy.js';

/**
 * A button is one element, so the anatomy is one part.
 *
 * No machine states: a button has nothing to be open or checked about.
 * Pressed/active is `:active`, which the recipe layer resolves as a real
 * pseudo-class, and a toggle button is a different component with its own
 * `pressed` flag rather than a mode of this one.
 */
export const buttonAnatomy = defineAnatomy('button', {
    root: {
        element: 'button',
        flags: ['disabled', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
});
