import { component, signal } from 'sigx';
import { Collapsible, Dialog, Switch, Tabs, themeController, listThemes } from '@sigx/zero';

export const App = component(() => {
    const state = signal({ tab: 'components', switchOn: true, dialogOpen: false });

    return () => (
        <main style={{ maxWidth: '40rem', margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
            <h1>SignalX Zero playground</h1>
            <p>
                Unstyled primitives + one design-system import. Current themes:{' '}
                {listThemes().map((t) => t.name).join(', ') || 'none registered'}
                {' '}
                <button onClick={() => themeController().toggle()}>toggle light/dark</button>
                {' '}
                <button onClick={() => themeController().setTheme(null)}>follow system</button>
            </p>

            <Tabs.Root model={[state, 'tab']}>
                <Tabs.List>
                    <Tabs.Tab value="components">Components</Tabs.Tab>
                    <Tabs.Tab value="about">About</Tabs.Tab>
                    <Tabs.Tab value="disabled" disabled>Disabled</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="components">
                    <h2>Switch</h2>
                    <Switch.Root model={[state, 'switchOn']}>Notifications</Switch.Root>
                    {' '}
                    <Switch.Root color="success" defaultChecked>Autosave</Switch.Root>
                    {' '}
                    <Switch.Root disabled>Disabled</Switch.Root>

                    <h2>Collapsible</h2>
                    <Collapsible.Root defaultOpen>
                        <Collapsible.Trigger>What is zero?</Collapsible.Trigger>
                        <Collapsible.Panel>
                            Headless, accessible components rendering a stable
                            data-scope/data-part/data-state anatomy. Styling is a
                            separate, generatable artifact.
                        </Collapsible.Panel>
                    </Collapsible.Root>

                    <h2>Dialog</h2>
                    <Dialog.Root model={[state, 'dialogOpen']}>
                        <Dialog.Trigger>Open dialog</Dialog.Trigger>
                        <Dialog.Popup>
                            <Dialog.Title>Native top layer</Dialog.Title>
                            <Dialog.Description>
                                This is a real &lt;dialog&gt; — focus trap, Escape and
                                backdrop come from the platform, not from JavaScript.
                            </Dialog.Description>
                            <Dialog.Close>Got it</Dialog.Close>
                        </Dialog.Popup>
                    </Dialog.Root>
                </Tabs.Panel>

                <Tabs.Panel value="about">
                    <p>
                        Swap the two design-system imports in <code>main.tsx</code>{' '}
                        (basic ↔ daisyui) and reload — same components, different skin.
                    </p>
                </Tabs.Panel>
                <Tabs.Panel value="disabled">
                    <p>Unreachable.</p>
                </Tabs.Panel>
            </Tabs.Root>
        </main>
    );
});
