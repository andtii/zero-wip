/**
 * Restore-on-reset — the web half of the form contract (`form-control.ts`
 * is the platform-neutral half, on `@sigx/zero/behaviors/core`).
 *
 * sigx writes `value`/`checked` as properties, so the platform's own reset
 * lands on the attribute default (usually empty) and would silently desync
 * the DOM from the model. Every control that posts restores its component
 * default into the model and re-syncs the element it owns.
 */

/** Anything that knows its owning form — every native form control does. */
export interface FormOwned {
    readonly form: HTMLFormElement | null;
}

/**
 * Run `restore` after the owning form resets. Call from `onMounted`, keep
 * the returned detach for `onUnmounted`.
 *
 * The owning form is resolved at EVENT time, not at mount: a leaf part's
 * `onMounted` runs before its element is inside the form (the parent
 * inserts the subtree afterwards), so `el.form` is null exactly when a
 * mount-time lookup would read it. `reset` bubbles, so one document
 * listener sees every form's reset and matches on the element's `form` —
 * which also honours the `form="id"` association.
 *
 * The restore runs one TASK after the event, not a microtask: the platform
 * resets its controls synchronously AFTER dispatching, and when the event
 * comes from the platform itself (a reset button) the JS stack is empty when
 * our listener returns, so a microtask checkpoint runs right there — before
 * the reset — and the restore would be overwritten. (Script-driven
 * `form.reset()` orders it the other way, which is why only a real browser
 * showed this.) A restore writes the component default into the model AND
 * re-syncs the element it owns — when the model already held the default
 * nothing re-renders, and the platform has just put the attribute default
 * (usually empty) in the DOM.
 */
export function onFormReset(getEl: () => FormOwned | null, restore: () => void): () => void {
    if (typeof document === 'undefined') return () => {};
    const handler = (e: Event): void => {
        const form = getEl()?.form ?? null;
        if (form && form === e.target) setTimeout(restore, 0);
    };
    document.addEventListener('reset', handler);
    return () => document.removeEventListener('reset', handler);
}
