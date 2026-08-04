import { describe, it, expect } from 'vitest';
import { renderToString } from '@sigx/server-renderer';
import { defineApp } from 'sigx';
import { Alert, Avatar, Badge, Card, Collapsible, Combobox, Dialog, Divider, Input, NumberInput, RatingGroup, Skeleton, Spinner, Switch, Tabs, Textarea, Toast, ToggleGroup, TreeView, createToaster, zeroPlugin } from '@sigx/zero';

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
            <Avatar.Root>
                <Avatar.Image src="/me.png" alt="Me" />
                <Avatar.Fallback>ME</Avatar.Fallback>
            </Avatar.Root>
            <Toast.Viewport toaster={createToaster()} />
            <Combobox.Root name="fruit" defaultValue="apple">
                <Combobox.Control>
                    <Combobox.Input />
                    <Combobox.Trigger />
                </Combobox.Control>
                <Combobox.Popup>
                    <Combobox.Item value="apple">Apple</Combobox.Item>
                </Combobox.Popup>
            </Combobox.Root>
            <ToggleGroup.Root defaultValue={['b']}>
                <ToggleGroup.Item value="a">A</ToggleGroup.Item>
                <ToggleGroup.Item value="b">B</ToggleGroup.Item>
            </ToggleGroup.Root>
            <NumberInput.Root name="qty" defaultValue={3} min={0} max={9}>
                <NumberInput.Label>Qty</NumberInput.Label>
                <NumberInput.Control>
                    <NumberInput.DecrementTrigger>−</NumberInput.DecrementTrigger>
                    <NumberInput.Input />
                    <NumberInput.IncrementTrigger>+</NumberInput.IncrementTrigger>
                </NumberInput.Control>
            </NumberInput.Root>
            <Input.Root name="email" type="email" defaultValue="a@b.c">
                <Input.Label>Email</Input.Label>
                <Input.Control>
                    <Input.Input placeholder="you@example.com" />
                </Input.Control>
            </Input.Root>
            <Textarea.Root name="bio" rows={3} defaultValue="hi">
                <Textarea.Label>Bio</Textarea.Label>
                <Textarea.Textarea />
            </Textarea.Root>
            <Card.Root variant="outline">
                <Card.Header>
                    <Card.Title>Report</Card.Title>
                    <Card.Description>Updated</Card.Description>
                </Card.Header>
                <Card.Body>Body</Card.Body>
                <Card.Footer>Footer</Card.Footer>
            </Card.Root>
            <Alert.Root color="warning">
                <Alert.Icon>!</Alert.Icon>
                <Alert.Title>Quota</Alert.Title>
                <Alert.Description>92% used.</Alert.Description>
                <Alert.Close />
            </Alert.Root>
            <Badge color="success">Active</Badge>
            <Divider />
            <Skeleton.Root>Article title</Skeleton.Root>
            <Spinner label="Loading results" />
            <RatingGroup.Root name="stars" defaultValue={2.5} allowHalf>
                <RatingGroup.Label>Stars</RatingGroup.Label>
                <RatingGroup.Control>
                    <RatingGroup.Item index={1} />
                    <RatingGroup.Item index={2} />
                    <RatingGroup.Item index={3} />
                </RatingGroup.Control>
            </RatingGroup.Root>
            <TreeView.Root defaultValue="a/1" defaultExpandedValues={['a']}>
                <TreeView.Label>Tree</TreeView.Label>
                <TreeView.Tree>
                    <TreeView.Branch value="a">
                        <TreeView.BranchTrigger><TreeView.BranchIndicator />a</TreeView.BranchTrigger>
                        <TreeView.BranchContent>
                            <TreeView.Item value="a/1">one</TreeView.Item>
                        </TreeView.BranchContent>
                    </TreeView.Branch>
                    <TreeView.Item value="b">b</TreeView.Item>
                </TreeView.Tree>
            </TreeView.Root>
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
        // Avatar renders loading on the server; the fallback stays visible.
        expect(html).toMatch(/data-scope="avatar"[^>]*data-part="root"[^>]*data-state="loading"/);
        // The toast viewport server-renders as an empty top-layer region.
        expect(html).toMatch(/<ol[^>]*data-scope="toast"[^>]*popover="manual"/);
        expect(html).not.toMatch(/data-scope="toast"[^>]*data-part="root"/);
        // The combobox posts pre-hydration and renders its popup closed.
        expect(html).toMatch(/data-scope="combobox"[^>]*data-part="hidden-input"[^>]*value="apple"/);
        expect(html).toMatch(/data-scope="combobox"[^>]*data-part="popup"[^>]*data-state="closed"/);
        // The toggle group's single tab stop resolves server-side from the
        // model (registration order stands in for DOM order).
        expect(html).toMatch(/data-scope="toggle-group"[^>]*data-part="item"[^>]*data-state="off"[^>]*tabindex="-1"/i);
        expect(html).toMatch(/data-scope="toggle-group"[^>]*data-part="item"[^>]*data-state="on"[^>]*tabindex="0"/i);
        // The number input posts pre-hydration and renders the committed value.
        expect(html).toMatch(/data-scope="number-input"[^>]*data-part="hidden-input"[^>]*value="3"/);
        expect(html).toMatch(/role="spinbutton"[^>]*data-scope="number-input"[^>]*data-part="input"/);
        // Rating renders the fractional display server-side and posts it.
        expect(html).toMatch(/data-scope="rating-group"[^>]*data-part="item"[^>]*data-state="half"/);
        expect(html).toMatch(/data-scope="rating-group"[^>]*data-part="hidden-input"[^>]*value="2.5"/);
        // The tree renders open branches, levels and the selected tab stop
        // server-side (registration order stands in for DOM order).
        expect(html).toMatch(/data-scope="tree-view"[^>]*data-part="branch"[^>]*data-state="open"/);
        expect(html).toMatch(/data-scope="tree-view"[^>]*data-part="item"[^>]*data-selected=""[^>]*tabindex="0"/i);
        expect(html).toMatch(/aria-level="2"/);
    });
});
