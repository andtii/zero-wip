import { component, signal } from 'sigx';
import { Dialog } from '@sigx/zero';
import type { PageEntry } from './registry';

const DialogDemos = component(() => {
    const state = signal({ dialogOpen: false, findOpen: false });

    return () => (
        <>
            <Dialog.Root model={() => state.dialogOpen}>
                <Dialog.Trigger>Open dialog</Dialog.Trigger>
                <Dialog.Popup>
                    <Dialog.Title>Native top layer</Dialog.Title>
                    <Dialog.Description>
                        This is a real &lt;dialog&gt; — focus trap, Escape and
                        backdrop come from the platform, not from JavaScript.
                    </Dialog.Description>
                    <Dialog.Footer>
                        <Dialog.Close>Cancel</Dialog.Close>
                        <Dialog.Close>Got it</Dialog.Close>
                    </Dialog.Footer>
                </Dialog.Popup>
            </Dialog.Root>
            {/*
              * The non-modal projection — a find bar: `show()` rather than
              * `showModal()`, so the page stays interactive, there is no
              * backdrop, and Escape dismissal is zero's own fallback (a
              * non-modal <dialog> fires no cancel event). Deliberately no
              * Title: a find bar has none, and the e2e suite asserts the
              * popup's `aria-labelledby` is absent rather than dangling.
              */}
            <Dialog.Root model={() => state.findOpen} modal={false}>
                <Dialog.Trigger>Open find bar</Dialog.Trigger>
                <Dialog.Popup>
                    <Dialog.Description>
                        Non-modal: the page behind stays live, Escape still closes.
                    </Dialog.Description>
                    <Dialog.Footer>
                        <Dialog.Close>Close find bar</Dialog.Close>
                    </Dialog.Footer>
                </Dialog.Popup>
            </Dialog.Root>
        </>
    );
}, { name: 'DialogDemos' });

export const dialogPage: PageEntry = {
    id: 'dialog',
    title: 'Dialog',
    category: 'Overlays',
    Demos: DialogDemos,
};
