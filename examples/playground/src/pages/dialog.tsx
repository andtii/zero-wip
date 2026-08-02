import { component, signal } from 'sigx';
import { Dialog } from '@sigx/zero';
import type { PageEntry } from './registry';

const DialogDemos = component(() => {
    const state = signal({ dialogOpen: false });

    return () => (
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
    );
}, { name: 'DialogDemos' });

export const dialogPage: PageEntry = {
    id: 'dialog',
    title: 'Dialog',
    category: 'Overlays',
    Demos: DialogDemos,
};
