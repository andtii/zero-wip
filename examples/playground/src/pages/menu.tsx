import { component } from 'sigx';
import type { PartProps } from '@sigx/zero';
import { Menu } from '@sigx/zero';
import type { PageEntry } from './registry';

const MenuDemos = component(() => () => (
    <>
        <Menu.Root onSelect={(v) => console.log('menu select:', v)}>
            <Menu.Trigger>Actions</Menu.Trigger>
            <Menu.Popup>
                <Menu.Group>
                    <Menu.GroupLabel>File</Menu.GroupLabel>
                    <Menu.Item value="rename">Rename</Menu.Item>
                    <Menu.Item value="duplicate">Duplicate</Menu.Item>
                </Menu.Group>
                <Menu.Sub>
                    <Menu.SubTrigger>Share</Menu.SubTrigger>
                    <Menu.SubPopup>
                        <Menu.Item value="email">Email</Menu.Item>
                        <Menu.Item value="link">Copy link</Menu.Item>
                        <Menu.Sub>
                            <Menu.SubTrigger>Social</Menu.SubTrigger>
                            <Menu.SubPopup>
                                <Menu.Item value="mastodon">Mastodon</Menu.Item>
                                <Menu.Item value="bluesky">Bluesky</Menu.Item>
                            </Menu.SubPopup>
                        </Menu.Sub>
                    </Menu.SubPopup>
                </Menu.Sub>
                <Menu.Separator />
                <Menu.Item value="delete">Delete…</Menu.Item>
            </Menu.Popup>
        </Menu.Root>

        <h2>Context menu</h2>
        <p>
            The same menu, opened at the pointer: <code>Menu.ContextTrigger</code>{' '}
            wraps any surface, right-click (or Shift+F10 for the keyboard —
            then it anchors to the surface, since a keyboard has no pointer)
            opens the popup at the point via a virtual anchor. A second
            right-click repositions in place — no close/reopen flicker.
        </p>
        <Menu.Root onSelect={(v) => console.log('context select:', v)}>
            <Menu.ContextTrigger asChild>
                {(p: PartProps) => (
                    <div
                        {...p}
                        tabIndex={0}
                        style={{
                            border: '2px dashed var(--color-base-300)',
                            borderRadius: 'var(--radius-box)',
                            padding: '2rem',
                            textAlign: 'center',
                            userSelect: 'none',
                        }}
                    >
                        Right-click (or Shift+F10) anywhere in this box
                    </div>
                )}
            </Menu.ContextTrigger>
            <Menu.Popup>
                <Menu.Item value="copy">Copy</Menu.Item>
                <Menu.Item value="paste">Paste</Menu.Item>
                <Menu.Sub>
                    <Menu.SubTrigger>Send to</Menu.SubTrigger>
                    <Menu.SubPopup>
                        <Menu.Item value="chat">Chat</Menu.Item>
                        <Menu.Item value="devices">Devices</Menu.Item>
                    </Menu.SubPopup>
                </Menu.Sub>
                <Menu.Separator />
                <Menu.Item value="inspect">Inspect</Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    </>
), { name: 'MenuDemos' });

export const menuPage: PageEntry = {
    id: 'menu',
    title: 'Menu',
    category: 'Overlays',
    Demos: MenuDemos,
};
