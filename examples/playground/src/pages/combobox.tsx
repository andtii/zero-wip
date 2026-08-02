import { component, signal } from 'sigx';
import { Combobox } from '@sigx/zero';
import { DemoRow } from '../demo/Section';
import type { PageEntry } from './registry';

const COUNTRIES = [
    'Argentina', 'Australia', 'Brazil', 'Canada', 'Denmark', 'Finland',
    'Germany', 'Iceland', 'Japan', 'Kenya', 'Mexico', 'Norway',
    'Portugal', 'Sweden', 'Thailand', 'Uruguay',
];

const ComboboxDemos = component(() => {
    const state = signal({
        country: '',
        countryQuery: '',
        countryOpen: false,
    });

    return () => (
        <>
            <p>
                The named-models convention in action: <code>model</code> is the
                selected value, <code>model:inputValue</code> the text,
                <code>model:open</code> the popup — and filtering is the
                consumer's, so this list is a plain <code>.filter()</code> over
                the bound query.
            </p>
            <Combobox.Root
                model={() => state.country}
                model:inputValue={() => state.countryQuery}
                model:open={() => state.countryOpen}
                name="country"
                placeholder="Search countries…"
            >
                <Combobox.Control>
                    <Combobox.Input />
                    <Combobox.Trigger />
                </Combobox.Control>
                <Combobox.Popup>
                    {COUNTRIES
                        .filter((c) => c.toLowerCase().includes(state.countryQuery.toLowerCase()))
                        .map((c) => (
                            <Combobox.Item value={c.toLowerCase()} key={c}>{c}</Combobox.Item>
                        ))}
                    {COUNTRIES.every((c) => !c.toLowerCase().includes(state.countryQuery.toLowerCase()))
                        ? <Combobox.Empty>No countries match</Combobox.Empty>
                        : null}
                </Combobox.Popup>
            </Combobox.Root>
            <p><small>Selected: <code>{state.country || '—'}</code></small></p>
            <p>
                <code>readonly</code> and <code>invalid</code> are chrome, not
                branches you have to write: readonly keeps the value, refuses to
                open and marks every part, invalid only flags. Both are stated
                once on the root.
            </p>
            <DemoRow gap="1rem">
                <Combobox.Root readonly defaultValue="sweden" defaultInputValue="Sweden">
                    <Combobox.Control>
                        <Combobox.Input />
                        <Combobox.Trigger />
                    </Combobox.Control>
                    <Combobox.Popup>
                        <Combobox.Item value="sweden">Sweden</Combobox.Item>
                    </Combobox.Popup>
                </Combobox.Root>
                <Combobox.Root invalid defaultInputValue="Atlantis">
                    <Combobox.Control>
                        <Combobox.Input />
                        <Combobox.Trigger />
                    </Combobox.Control>
                    <Combobox.Popup>
                        <Combobox.Item value="sweden">Sweden</Combobox.Item>
                        <Combobox.Item value="norway">Norway</Combobox.Item>
                    </Combobox.Popup>
                </Combobox.Root>
            </DemoRow>
        </>
    );
}, { name: 'ComboboxDemos' });

export const comboboxPage: PageEntry = {
    id: 'combobox',
    title: 'Combobox',
    category: 'Forms & inputs',
    Demos: ComboboxDemos,
};
