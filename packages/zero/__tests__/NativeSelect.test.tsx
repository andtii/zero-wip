import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Field, NativeSelect, nativeSelectAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

const OPTIONS = [
    { value: 'apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry', disabled: true },
] as const;

const part = (c: HTMLElement, name: string) =>
    c.querySelector<HTMLElement>(`[data-scope="native-select"][data-part="${name}"]`)!;
const control = (c: HTMLElement) => part(c, 'control') as unknown as HTMLSelectElement;

function change(el: HTMLSelectElement, value: string) {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('NativeSelect', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy: span root wrapping a real <select> and a chevron', () => {
        render(<NativeSelect name="pet" options={OPTIONS} placeholder="Pick a pet…" />, container);
        expectAnatomy(container, nativeSelectAnatomy);
        expect(part(container, 'root').tagName).toBe('SPAN');
        expect(control(container).tagName).toBe('SELECT');
        expect(part(container, 'indicator').getAttribute('aria-hidden')).toBe('true');
        // The real form control posts under its own name — no hidden mirror.
        expect(control(container).name).toBe('pet');
        expect(container.querySelectorAll('select').length).toBe(1);
    });

    it('options render real <option> elements; `group` becomes a real <optgroup>', () => {
        render(
            <NativeSelect
                options={[
                    { value: 'lemon', group: 'Citrus' },
                    { value: 'peach', group: 'Stone' },
                    { value: 'lime', group: 'Citrus' },
                    { value: 'salt' },
                ]}
            />,
            container,
        );
        const groups = [...container.querySelectorAll('optgroup')];
        expect(groups.map((g) => g.label)).toEqual(['Citrus', 'Stone']);
        // First-appearance order: lime folds back into Citrus.
        expect([...groups[0]!.querySelectorAll('option')].map((o) => o.value)).toEqual(['lemon', 'lime']);
        // The ungrouped option is a direct child of the select.
        expect(control(container).querySelector(':scope > option[value="salt"]')).toBeTruthy();
    });

    it('label defaults to value; disabled flows onto the <option>', () => {
        render(<NativeSelect options={OPTIONS} />, container);
        const options = [...container.querySelectorAll('option')];
        expect(options.map((o) => o.textContent)).toEqual(['apple', 'Banana', 'Cherry']);
        expect(options[2]!.disabled).toBe(true);
    });

    it('explicit slot children win entirely over options', () => {
        render(
            <NativeSelect options={OPTIONS}>
                <option value="mango">Mango</option>
            </NativeSelect>,
            container,
        );
        const options = [...container.querySelectorAll('option')];
        expect(options.map((o) => o.value)).toEqual(['mango']);
    });

    it('the model is the selected value, two-way', async () => {
        const state = signal({ pet: 'banana' });
        render(<NativeSelect model={[state, 'pet']} options={OPTIONS} />, container);
        await Promise.resolve();
        expect(control(container).value).toBe('banana');

        change(control(container), 'apple');
        expect(state.pet).toBe('apple');

        state.pet = 'banana';
        await new Promise((r) => setTimeout(r, 0));
        expect(control(container).value).toBe('banana');
    });

    it('an empty model with no placeholder rests on the first option, never a blanked control', async () => {
        // Copilot review, #337: the mounted sync must not write '' into a
        // select that has no empty option — the write would deselect
        // everything, where the platform's own resting state (and the raw
        // <select> this component wraps) shows the first option.
        const state = signal({ pet: '' });
        render(<NativeSelect model={[state, 'pet']} options={OPTIONS} />, container);
        await new Promise((r) => setTimeout(r, 0));
        expect(control(container).value).toBe('apple');
        expect(control(container).selectedIndex).toBe(0);
    });

    it('placeholder renders a disabled empty option and sets data-placeholder while value is empty', () => {
        const state = signal({ pet: '' });
        render(<NativeSelect model={[state, 'pet']} options={OPTIONS} placeholder="Pick a pet…" />, container);
        const first = container.querySelector('option')!;
        expect(first.value).toBe('');
        expect(first.disabled).toBe(true);
        expect(first.textContent).toBe('Pick a pet…');
        expect(part(container, 'root').getAttribute('data-placeholder')).toBe('');
        expect(control(container).getAttribute('data-placeholder')).toBe('');

        change(control(container), 'apple');
        expect(part(container, 'root').hasAttribute('data-placeholder')).toBe(false);
    });

    it('no data-placeholder without a placeholder prop, even when the value is empty', () => {
        render(<NativeSelect options={OPTIONS} />, container);
        expect(part(container, 'root').hasAttribute('data-placeholder')).toBe(false);
    });

    it('disabled/invalid/required pass through to the flags and the real control', () => {
        render(<NativeSelect options={OPTIONS} disabled invalid required />, container);
        for (const name of ['root', 'control']) {
            const el = part(container, name);
            expect(el.getAttribute('data-disabled'), `${name} data-disabled`).toBe('');
            expect(el.getAttribute('data-invalid'), `${name} data-invalid`).toBe('');
            expect(el.getAttribute('data-required'), `${name} data-required`).toBe('');
        }
        expect(control(container).disabled).toBe(true);
        expect(control(container).required).toBe(true);
        expect(control(container).getAttribute('aria-invalid')).toBe('true');
    });

    it('adopts field wiring: control id, describedby and flags come from the Field', () => {
        render(
            <Field.Root invalid required>
                <Field.Label>Pet</Field.Label>
                <NativeSelect options={OPTIONS} />
                <Field.Description>Choose wisely.</Field.Description>
                <Field.Error>Required.</Field.Error>
            </Field.Root>,
            container,
        );
        const select = control(container);
        const label = container.querySelector<HTMLLabelElement>('[data-scope="field"][data-part="label"]')!;
        expect(select.id).not.toBe('');
        expect(label.getAttribute('for')).toBe(select.id);
        const describedBy = select.getAttribute('aria-describedby') ?? '';
        for (const name of ['description', 'error']) {
            expect(describedBy, `aria-describedby must name the field's ${name}`).toContain(
                container.querySelector(`[data-scope="field"][data-part="${name}"]`)!.id,
            );
        }
        expect(part(container, 'root').getAttribute('data-invalid')).toBe('');
        expect(select.required).toBe(true);
        expect(select.getAttribute('aria-invalid')).toBe('true');
    });

    it('the variant axes land on the root — the carrier', () => {
        render(<NativeSelect options={OPTIONS} color="primary" size="lg" />, container);
        const root = part(container, 'root');
        expect(root.getAttribute('data-color')).toBe('primary');
        expect(root.getAttribute('data-size')).toBe('lg');
    });
});
