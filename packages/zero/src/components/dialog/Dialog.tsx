/**
 * Dialog — modal (and non-modal) overlay on the native `<dialog>` element.
 *
 * ```tsx
 * <Dialog.Root model={() => state.open}>
 *     <Dialog.Trigger>Open</Dialog.Trigger>
 *     <Dialog.Popup>
 *         <Dialog.Title>Title</Dialog.Title>
 *         <Dialog.Description>…</Dialog.Description>
 *         <Dialog.Close>Close</Dialog.Close>
 *     </Dialog.Popup>
 * </Dialog.Root>
 * ```
 *
 * The top layer replaces any Portal: the server renders the popup closed in
 * place, and `showModal()` gives focus trapping, Escape, inert background
 * and focus restore natively. State flows one way — the model opens/closes
 * the element in an effect, and native `close` events sync back.
 */
import { component, compound, defineInjectable, defineProvide, effect } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import { renderAsChild } from '../../contract/as-child.js';
import { variantAttrs } from '../../contract/props.js';
import type { PartProps, WithAsChild, WithClass, WithDisabled, WithVariantAxes } from '../../contract/props.js';
import { dialogAnatomy } from './anatomy.js';

const SCOPE = dialogAnatomy.scope;

interface DialogContext {
    state: ControllableState<boolean>;
    modal(): boolean;
    dismissible(): boolean;
    ids: { popup: string; title: string; description: string };
}

function makeInert(): DialogContext {
    let open = false;
    return {
        state: {
            get value() { return open; },
            set value(v: boolean) { open = v; },
        },
        modal: () => true,
        dismissible: () => true,
        ids: { popup: 'zx-dialog-inert', title: 'zx-dialog-inert-title', description: 'zx-dialog-inert-desc' },
    };
}

export const useDialogContext = defineInjectable<DialogContext>(() => makeInert());

// ── Root ──

export type DialogRootProps =
    & Define.Model<boolean>
    & Define.Prop<'defaultOpen', boolean, false>
    & Define.Event<'openChange', boolean>
    & Define.Prop<'modal', boolean, false>
    & Define.Prop<'dismissible', boolean, false>
    & Define.Slot<'default'>;

const DialogRoot = component<DialogRootProps>(({ props, slots, emit }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        props.defaultOpen ?? false,
        (v) => emit('openChange', v),
    );
    const baseId = createId('zx-dialog');
    const ctx: DialogContext = {
        state,
        modal: () => props.modal ?? true,
        dismissible: () => props.dismissible ?? true,
        ids: {
            popup: `${baseId}-popup`,
            title: `${baseId}-title`,
            description: `${baseId}-desc`,
        },
    };
    defineProvide(useDialogContext, () => ctx);

    return () => <>{slots.default?.()}</>;
}, { name: 'Dialog.Root' });

// ── Trigger ──

export type DialogTriggerProps =
    & WithDisabled
    & WithClass
    & WithVariantAxes<'dialog'>
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const DialogTrigger = component<DialogTriggerProps>(({ props, slots, signal }) => {
    const dialog = useDialogContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'trigger',
        ...variantAttrs(props),
        'data-state': stateAttr(dialog.state.value, 'open', 'closed'),
        'data-disabled': dataAttr(props.disabled),
        'data-focus-visible': dataAttr(focus.visible),
        'aria-haspopup': 'dialog',
        'aria-expanded': dialog.state.value ? 'true' : 'false',
        'aria-controls': dialog.ids.popup,
        onClick: () => {
            if (!props.disabled) dialog.state.value = true;
        },
        onFocus: () => { focus.visible = isFocusVisible(el); },
        onBlur: (e: FocusEvent) => {
            press.onBlur(e);
            focus.visible = false;
        },
        onKeydown: press.onKeydown,
        onKeyup: press.onKeyup,
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: press.onPointerleave,
        ref: (node: HTMLElement | null) => { el = node; },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button type="button" class={props.class} {...b} disabled={props.disabled}>
                {slots.default?.(b)}
            </button>
        );
    };
}, { name: 'Dialog.Trigger' });

// ── Popup ──

export type DialogPopupProps = WithClass & Define.Slot<'default'>;

const DialogPopup = component<DialogPopupProps>(({ props, slots, onMounted }) => {
    const dialog = useDialogContext();
    let el: HTMLDialogElement | null = null;

    onMounted(() => {
        effect(() => {
            const open = dialog.state.value;
            const node = el;
            if (!node || typeof node.showModal !== 'function') return;
            if (open && !node.open) {
                if (dialog.modal()) node.showModal();
                else node.show();
            } else if (!open && node.open) {
                node.close();
            }
        });
    });

    return () => (
        <dialog
            id={dialog.ids.popup}
            data-scope={SCOPE}
            data-part="popup"
            data-state={stateAttr(dialog.state.value, 'open', 'closed')}
            aria-labelledby={dialog.ids.title}
            aria-describedby={dialog.ids.description}
            class={props.class}
            ref={(node: HTMLDialogElement | null) => { el = node; }}
            onClose={() => { dialog.state.value = false; }}
            onCancel={(e: Event) => {
                // Native Escape: let the model decide. Prevent the default
                // close and route through state so non-dismissible dialogs
                // stay open and controlled parents stay authoritative.
                e.preventDefault();
                if (dialog.dismissible()) dialog.state.value = false;
            }}
            onClick={(e: MouseEvent) => {
                // A click that lands on the <dialog> itself (not its
                // children) is a backdrop click.
                if (dialog.dismissible() && e.target === el) {
                    dialog.state.value = false;
                }
            }}
        >
            {slots.default?.()}
        </dialog>
    );
}, { name: 'Dialog.Popup' });

// ── Title / Description ──

export type DialogTitleProps = WithClass & Define.Slot<'default'>;

const DialogTitle = component<DialogTitleProps>(({ props, slots }) => {
    const dialog = useDialogContext();
    return () => (
        <h2 id={dialog.ids.title} data-scope={SCOPE} data-part="title" class={props.class}>
            {slots.default?.()}
        </h2>
    );
}, { name: 'Dialog.Title' });

export type DialogDescriptionProps = WithClass & Define.Slot<'default'>;

const DialogDescription = component<DialogDescriptionProps>(({ props, slots }) => {
    const dialog = useDialogContext();
    return () => (
        <p id={dialog.ids.description} data-scope={SCOPE} data-part="description" class={props.class}>
            {slots.default?.()}
        </p>
    );
}, { name: 'Dialog.Description' });

// ── Footer ──

export type DialogFooterProps = WithClass & Define.Slot<'default'>;

/** The action row — the shared `footer` part every platform's dialog has. */
const DialogFooter = component<DialogFooterProps>(({ props, slots }) => (
    () => (
        <footer data-scope={SCOPE} data-part="footer" class={props.class}>
            {slots.default?.()}
        </footer>
    )
), { name: 'Dialog.Footer' });

// ── Close ──

export type DialogCloseProps =
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const DialogClose = component<DialogCloseProps>(({ props, slots, signal }) => {
    const dialog = useDialogContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'close',
        'data-disabled': dataAttr(props.disabled),
        'data-focus-visible': dataAttr(focus.visible),
        onClick: () => {
            if (!props.disabled) dialog.state.value = false;
        },
        onFocus: () => { focus.visible = isFocusVisible(el); },
        onBlur: (e: FocusEvent) => {
            press.onBlur(e);
            focus.visible = false;
        },
        onKeydown: press.onKeydown,
        onKeyup: press.onKeyup,
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: press.onPointerleave,
        ref: (node: HTMLElement | null) => { el = node; },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button type="button" class={props.class} {...b} disabled={props.disabled}>
                {slots.default?.(b)}
            </button>
        );
    };
}, { name: 'Dialog.Close' });

export const Dialog = compound(DialogRoot, {
    Root: DialogRoot,
    Trigger: DialogTrigger,
    Popup: DialogPopup,
    Title: DialogTitle,
    Description: DialogDescription,
    Footer: DialogFooter,
    Close: DialogClose,
});
