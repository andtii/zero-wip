/**
 * Collapsible — a disclosure built on native `<details>`/`<summary>`.
 *
 * ```tsx
 * <Collapsible.Root model={() => state.open}>
 *     <Collapsible.Trigger>Details</Collapsible.Trigger>
 *     <Collapsible.Panel>…</Collapsible.Panel>
 * </Collapsible.Root>
 * ```
 *
 * The native element gives keyboard interaction, semantics and (server
 * rendered) zero-JS toggling for free; the component keeps the `model` in
 * charge by intercepting the summary click and rendering `open` from state.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import type { WithClass, WithDisabled } from '../../contract/props.js';
import { collapsibleAnatomy } from './anatomy.js';

const SCOPE = collapsibleAnatomy.scope;

interface CollapsibleContext {
    state: ControllableState<boolean>;
    disabled(): boolean;
}

function makeInert(): CollapsibleContext {
    let open = false;
    return {
        state: {
            get value() { return open; },
            set value(v: boolean) { open = v; },
        },
        disabled: () => false,
    };
}

export const useCollapsibleContext = defineInjectable<CollapsibleContext>(() => makeInert());

// ── Root ──

export type CollapsibleRootProps =
    & Define.Model<boolean>
    & Define.Prop<'defaultOpen', boolean, false>
    & Define.Event<'openChange', boolean>
    & WithDisabled
    & WithClass
    & Define.Slot<'default'>;

const CollapsibleRoot = component<CollapsibleRootProps>(({ props, slots, emit }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        props.defaultOpen ?? false,
        (v) => emit('openChange', v),
    );
    const ctx: CollapsibleContext = {
        state,
        disabled: () => !!props.disabled,
    };
    defineProvide(useCollapsibleContext, () => ctx);

    return () => (
        <details
            data-scope={SCOPE}
            data-part="root"
            data-state={stateAttr(state.value, 'open', 'closed')}
            data-disabled={dataAttr(props.disabled)}
            open={state.value}
            class={props.class}
        >
            {slots.default?.()}
        </details>
    );
}, { name: 'Collapsible.Root' });

// ── Trigger ──

export type CollapsibleTriggerProps = WithClass & Define.Slot<'default'>;

const CollapsibleTrigger = component<CollapsibleTriggerProps>(({ props, slots, signal }) => {
    const ctx = useCollapsibleContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => ctx.disabled(),
    });

    return () => (
        <summary
            data-scope={SCOPE}
            data-part="trigger"
            data-state={stateAttr(ctx.state.value, 'open', 'closed')}
            data-disabled={dataAttr(ctx.disabled())}
            data-focus-visible={dataAttr(focus.visible)}
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; }}
            onClick={(e: MouseEvent) => {
                // The model stays in charge: never let the platform toggle
                // ahead of (or against) the bound state.
                e.preventDefault();
                if (!ctx.disabled()) ctx.state.value = !ctx.state.value;
            }}
            onKeydown={press.onKeydown}
            onKeyup={press.onKeyup}
            onPointerdown={press.onPointerdown}
            onPointerup={press.onPointerup}
            onPointercancel={press.onPointercancel}
            onPointerleave={press.onPointerleave}
            onFocus={() => { focus.visible = isFocusVisible(el); }}
            onBlur={(e: FocusEvent) => {
                press.onBlur(e);
                focus.visible = false;
            }}
        >
            {slots.default?.()}
        </summary>
    );
}, { name: 'Collapsible.Trigger' });

// ── Panel ──

export type CollapsiblePanelProps = WithClass & Define.Slot<'default'>;

const CollapsiblePanel = component<CollapsiblePanelProps>(({ props, slots }) => {
    const ctx = useCollapsibleContext();
    return () => (
        <div
            data-scope={SCOPE}
            data-part="panel"
            data-state={stateAttr(ctx.state.value, 'open', 'closed')}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Collapsible.Panel' });

export const Collapsible = compound(CollapsibleRoot, {
    Root: CollapsibleRoot,
    Trigger: CollapsibleTrigger,
    Panel: CollapsiblePanel,
});
