import { defineAnatomy } from '../../contract/anatomy.js';

/**
 * TreeView — the APG tree pattern.
 *
 * `branch` is the treeitem ELEMENT (it wraps its group, so aria-expanded
 * and aria-level sit on it — the APG shape); `branch-trigger` is the
 * visible clickable row inside it, the thing recipes highlight — it mirrors
 * the branch's state plus its own focus, so a ring draws on the row, never
 * around the whole subtree. `branch-content` is the role=group container
 * whose open|closed state recipes animate.
 */
export const treeViewAnatomy = defineAnatomy('tree-view', {
    root: {
        element: 'div',
        flags: ['disabled'],
        tokens: ['color'],
    },
    label: {
        element: 'div',
        tokens: ['color', 'text'],
    },
    tree: {
        element: 'div',
        tokens: ['color'],
    },
    item: {
        element: 'div',
        flags: ['selected', 'disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    branch: {
        element: 'div',
        states: ['open', 'closed'],
        flags: ['selected', 'disabled'],
    },
    'branch-trigger': {
        element: 'div',
        states: ['open', 'closed'],
        flags: ['selected', 'disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    'branch-indicator': {
        element: 'span',
        states: ['open', 'closed'],
    },
    'branch-content': {
        element: 'div',
        states: ['open', 'closed'],
    },
});
