/**
 * Controllable state — the zero standard for stateful components.
 *
 * One optional `model` prop (sigx two-way binding) replaces the
 * controlled/uncontrolled `value`/`defaultValue`/`onChange` triplet:
 *
 * - `model` present → the parent's signal is the source of truth
 *   (`<Dialog.Root model={isOpen}>` is fully controlled, zero wiring).
 * - `model` absent → an internal signal seeded from the `default*` prop.
 * - Every actual change fires `onChange` (→ the component's change event),
 *   in both modes.
 */
import { signal } from 'sigx';
import type { Model } from 'sigx';

export interface ControllableState<T> {
    get value(): T;
    set value(v: T);
}

export function createControllableState<T>(
    getModel: () => Model<T> | undefined,
    defaultValue: T,
    onChange?: (value: T) => void,
): ControllableState<T> {
    const internal = signal({ current: defaultValue });

    return {
        get value(): T {
            const model = getModel();
            return model ? model.value : (internal.current as T);
        },
        set value(v: T) {
            const model = getModel();
            const prev = model ? model.value : (internal.current as T);
            if (prev === v) return;
            if (model) {
                model.value = v;
            } else {
                internal.current = v as typeof internal.current;
            }
            onChange?.(v);
        },
    };
}
