import { component } from 'sigx';
import { Badge, Button, Card, Col, Row, Spacer, Stack } from '@sigx/zero';
import { DemoRow } from '../demo/Section';
import { pickRole, pickScopeVariant } from '../design-systems';
import type { PageEntry } from './registry';

/**
 * A boxed child, so the geometry demos have something with visible edges.
 * Deliberately a zero component rather than a styled div: the page has to
 * survive the ds-smoke vocabulary invariant like any other.
 */
const Cell = component<{ children?: unknown }>(({ slots }) => () => (
    // No `variant`: not every skin wires one for badge (daisyui does not),
    // and the ds-smoke vocabulary invariant rightly fails a demo that
    // renders an axis value the live manifest never declared.
    <Badge>{slots.default?.()}</Badge>
), { name: 'Cell' });

const LayoutDemos = component(() => () => (
    <>
        <p>
            The layout tier. <code>Row</code> and <code>Col</code> are the same{' '}
            <code>stack</code> scope with a different{' '}
            <code>data-orientation</code>; <code>Spacer</code> pushes one
            boundary apart where <code>gap</code> would space everything
            equally.
        </p>
        <p>
            Every value here is a rung of the design system's own{' '}
            <code>--space-*</code> ramp, never a length — so switching the
            toolbar re-spaces this whole page, not just its controls. That is
            the thing to look at: the components do not change, the rhythm
            does.
        </p>

        <h3>gap</h3>
        <p>
            The same row at four rungs. A skin with a tight ramp (basic) and
            one with a coarse one (brutalist) disagree about how far apart
            these sit, and both are right.
        </p>
        {(['xs', 'sm', 'md', 'xl'] as const).map((gap) => (
            <DemoRow align="center">
                <code style="min-inline-size: 3rem">{gap}</code>
                <Row gap={gap}>
                    <Cell>one</Cell>
                    <Cell>two</Cell>
                    <Cell>three</Cell>
                </Row>
            </DemoRow>
        ))}

        <h3>align and justify</h3>
        <DemoRow>
            <Row gap="md" align="center" justify="between" padY="sm">
                <Cell>start</Cell>
                <Cell>middle</Cell>
                <Cell>end</Cell>
            </Row>
        </DemoRow>

        <h3>Spacer</h3>
        <p>
            The toolbar shape: a label at the reading edge, actions at the
            other, and nothing nested to achieve it.
        </p>
        {/* Deliberately NOT inside a DemoRow: that is itself a flex row, so
            the toolbar would be sized by its own content and a flexible
            Spacer would have no leftover room to take. At block level a Row
            is full width, which is the shape a real toolbar has. */}
        <Row gap="sm" align="center" padY="sm">
            <strong>Document</strong>
            <Spacer />
            <Button.Root variant={pickScopeVariant('button', 'outline', 'ghost', 'tertiary')} size="sm">Cancel</Button.Root>
            <Button.Root color={pickRole('primary')} size="sm">Save</Button.Root>
        </Row>
        <p>
            Given a <code>space</code> it stops flexing and becomes a fixed
            rung instead.
        </p>
        <DemoRow align="center">
            <Row gap="none">
                <Cell>a</Cell>
                <Spacer space="2xl" />
                <Cell>b</Cell>
            </Row>
        </DemoRow>

        <h3>Stack.Item grow</h3>
        <p>
            <code>flex-grow</code> applies to the flex item itself, so the
            child carries the part — which is why <code>Item</code> supports{' '}
            <code>asChild</code>.
        </p>
        <DemoRow>
            <Row gap="md">
                <Cell>fixed</Cell>
                <Stack.Item grow>
                    <Card.Root>
                        <Card.Body>takes the rest</Card.Body>
                    </Card.Root>
                </Stack.Item>
            </Row>
        </DemoRow>

        <h3>Responsive</h3>
        <p>
            A per-instance value per breakpoint —{' '}
            <code>{'gap={{ base: \'xs\', md: \'xl\' }}'}</code> renders{' '}
            <code>data-l-gap</code> plus <code>data-l-md-gap</code>. Narrow the
            window past this design system's <code>md</code> and the row
            tightens. The breakpoints are the skin's own, so the width this
            happens at changes with the toolbar too.
        </p>
        <DemoRow>
            <Row gap={{ base: 'xs', md: 'xl' }}>
                <Cell>one</Cell>
                <Cell>two</Cell>
                <Cell>three</Cell>
            </Row>
        </DemoRow>

        <h3>Nesting</h3>
        <p>
            A <code>Col</code> of <code>Row</code>s. Each layout part
            re-declares its own spacing, so the inner rows keep their own gap
            rather than inheriting the outer one.
        </p>
        <DemoRow>
            <Col gap="lg" pad="md">
                <Row gap="2xs"><Cell>tight</Cell><Cell>tight</Cell></Row>
                <Row gap="xl"><Cell>loose</Cell><Cell>loose</Cell></Row>
            </Col>
        </DemoRow>
    </>
), { name: 'LayoutDemos' });

export const layoutPage: PageEntry = {
    id: 'layout',
    title: 'Layout',
    category: 'Layout',
    Demos: LayoutDemos,
};
