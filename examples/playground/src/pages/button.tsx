import { component } from 'sigx';
import { Button } from '@sigx/zero';
import { activeVocabulary } from '../design-systems';
import { DemoRow, AxisLabel } from '../demo/Section';
import type { PageEntry } from './registry';

/**
 * Four roles is enough to read a variant row; eight or thirteen turns it into
 * a wall. The design system still decides WHICH four, so a system that renames
 * or drops them shows its own.
 */
const SWATCH_LIMIT = 4;

const ButtonDemos = component(() => {
    // Read inside the render closure, so switching design systems re-renders
    // the rows against the newly active vocabulary.
    const axes = activeVocabulary;
    const swatchColors = () => axes().colors.slice(0, SWATCH_LIMIT);

    return () => (
        <>
            <p>
                Every row below is read from the active design system's compiled
                manifest, not from a list written here — so a design system with
                seven variants shows seven, and one with no <code>color</code>{' '}
                axis shows no colour row at all. Nothing in this file knows which
                design system is loaded.
            </p>
            {axes().variants.map((variant) => (
                <DemoRow>
                    <AxisLabel>{variant}</AxisLabel>
                    {/*
                      * A colourless design system fuses colour into `variant`,
                      * so there is nothing to cross it with — one button per
                      * variant is the whole story there.
                      */}
                    {axes().colors.length === 0
                        ? <Button.Root variant={variant}>{variant}</Button.Root>
                        : swatchColors().map((color) => (
                            <Button.Root color={color} variant={variant}>{color}</Button.Root>
                        ))}
                    <Button.Root variant={variant} disabled>disabled</Button.Root>
                </DemoRow>
            ))}
            <DemoRow>
                <AxisLabel>size</AxisLabel>
                {axes().sizes.map((size) => (
                    <Button.Root size={size}>{size}</Button.Root>
                ))}
            </DemoRow>
            {axes().modifiers.length > 0 && (
                <DemoRow>
                    {/*
                      * Presence-only: `mods` renders `data-mod-<name>` with no
                      * value, the way the anatomy's own flags do.
                      */}
                    <AxisLabel>mods</AxisLabel>
                    {axes().modifiers.map((mod) => (
                        <Button.Root mods={{ [mod]: true }}>{mod}</Button.Root>
                    ))}
                </DemoRow>
            )}
        </>
    );
}, { name: 'ButtonDemos' });

export const buttonPage: PageEntry = {
    id: 'button',
    title: 'Button',
    category: 'Actions',
    Demos: ButtonDemos,
};
