import { describe, it, expect, beforeEach } from 'vitest';
import {
    clearThemes, getTheme, listThemes, pairOf, pickThemeFor, registerTheme, registerThemes,
} from '@sigx/zero';

const basic = { name: 'basic', colorScheme: 'light', pair: 'basic-dark' } as const;
const basicDark = { name: 'basic-dark', colorScheme: 'dark', pair: 'basic' } as const;

describe('theme registry', () => {
    beforeEach(() => clearThemes());

    it('registers and reads back', () => {
        registerTheme(basic);
        expect(getTheme('basic')).toMatchObject({ name: 'basic', colorScheme: 'light' });
        expect(listThemes()).toHaveLength(1);
        expect(pairOf('basic')).toBe('basic-dark');
    });

    it('clearThemes empties the registry', () => {
        registerTheme(basic);
        registerTheme(basicDark);
        expect(listThemes()).toHaveLength(2);

        clearThemes();

        expect(listThemes()).toEqual([]);
        expect(getTheme('basic')).toBeUndefined();
        expect(pairOf('basic')).toBeUndefined();
        expect(pickThemeFor('dark')).toBeUndefined();
    });

    // The point of clearThemes(): a host swapping design systems must not keep
    // offering themes whose stylesheet is no longer loaded. Re-seeding without
    // clearing would leave `basic-dark` selectable under daisyui, where no
    // [data-theme="basic-dark"] block exists.
    it('re-seeding after a clear replaces the previous design system', () => {
        registerTheme(basic);
        registerTheme(basicDark);

        clearThemes();
        registerTheme({ name: 'light', colorScheme: 'light', pair: 'dark' });
        registerTheme({ name: 'dark', colorScheme: 'dark', pair: 'light' });

        expect(listThemes().map((t) => t.name)).toEqual(['light', 'dark']);
        expect(getTheme('basic-dark')).toBeUndefined();
        expect(pickThemeFor('dark')).toBe('dark');
    });

    // The playground's switcher path: seed from a whole declaration, then
    // replace it with another design system's.
    it('clears themes seeded through registerThemes', () => {
        registerThemes({
            roles: { primary: {}, neutral: {} },
            themes: {
                basic: {
                    colorScheme: 'light',
                    pair: 'basic-dark',
                    colors: { primary: '#111', 'base-100': '#fff', 'base-content': '#000' },
                },
            },
        });
        expect(getTheme('basic')?.swatch).toMatchObject({ primary: '#111', 'base-100': '#fff' });

        clearThemes();

        expect(listThemes()).toEqual([]);
    });

    it('refuses to clear on the server', () => {
        // Swap the property rather than deleting it, and put the original
        // descriptor back — happy-dom's `document` is not a plain writable
        // value, so assigning it back would leak a different descriptor into
        // every test file that runs after this one.
        const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
        Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true });
        try {
            expect(() => clearThemes()).toThrow(/browser-only/);
        } finally {
            if (original) Object.defineProperty(globalThis, 'document', original);
            else Reflect.deleteProperty(globalThis, 'document');
        }
        expect(typeof document).toBe('object');
    });
});
