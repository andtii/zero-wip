import { describe, it, expect } from 'vitest';
import { renderToString } from '@sigx/server-renderer';
import { defineApp } from 'sigx';
import { Collapsible, Dialog, Switch, Tabs, zeroPlugin } from '@sigx/zero';

function page() {
    return (
        <div>
            <Tabs.Root defaultValue="a">
                <Tabs.List>
                    <Tabs.Tab value="a">First</Tabs.Tab>
                    <Tabs.Tab value="b">Second</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="a">Panel A</Tabs.Panel>
                <Tabs.Panel value="b">Panel B</Tabs.Panel>
            </Tabs.Root>
            <Collapsible.Root defaultOpen>
                <Collapsible.Trigger>Toggle</Collapsible.Trigger>
                <Collapsible.Panel>Content</Collapsible.Panel>
            </Collapsible.Root>
            <Switch.Root defaultChecked color="primary">Label</Switch.Root>
            <Dialog.Root>
                <Dialog.Trigger>Open</Dialog.Trigger>
                <Dialog.Popup>
                    <Dialog.Title>Title</Dialog.Title>
                    <Dialog.Close>Close</Dialog.Close>
                </Dialog.Popup>
            </Dialog.Root>
        </div>
    );
}

// The per-request app factory pattern: a fresh app with zeroPlugin() gives
// each render its own id generator, so ids are deterministic per request.
function renderPage(): Promise<string> {
    const app = defineApp(page());
    app.use(zeroPlugin());
    return renderToString(app);
}

describe('SSR', () => {
    it('server markup is deterministic across renders', async () => {
        const a = await renderPage();
        const b = await renderPage();
        expect(a).toBe(b);
    });

    it('renders the anatomy and closed overlays on the server', async () => {
        const html = await renderPage();
        expect(html).toContain('data-scope="tabs"');
        expect(html).toContain('data-state="active"');
        expect(html).toContain('data-scope="collapsible"');
        // Overlays render closed; content is present for SEO but the dialog
        // is not open.
        expect(html).toContain('data-scope="dialog"');
        expect(html).toMatch(/<dialog[^>]*data-state="closed"/);
        expect(html).not.toMatch(/<dialog[^>]*\sopen/);
        // Variant axes serialize.
        expect(html).toContain('data-color="primary"');
    });
});
