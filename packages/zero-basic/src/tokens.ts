/**
 * zero-basic tokens — a neutral, readable default palette.
 *
 * Type-only import from the kit: this module is pure data and ships in the
 * runtime bundle (installThemes derives registry metadata from it), so it
 * must not pull the Node-only kit at runtime.
 */
import type { TokensInput } from '@sigx/zero-kit';

export const tokens: TokensInput = {
    defaultLight: 'basic',
    defaultDark: 'basic-dark',
    themes: {
        basic: {
            colorScheme: 'light',
            pair: 'basic-dark',
            softMix: 0.12,
            colors: {
                'base-100': 'oklch(100% 0 0)',
                'base-200': 'oklch(96.5% 0.001 286)',
                'base-300': 'oklch(92% 0.002 286)',
                'base-content': 'oklch(24% 0.01 285)',
                primary: 'oklch(48% 0.21 262)',
                'primary-content': 'oklch(97% 0.014 262)',
                secondary: 'oklch(48% 0.15 300)',
                'secondary-content': 'oklch(97% 0.012 300)',
                accent: 'oklch(52% 0.13 200)',
                'accent-content': 'oklch(97% 0.01 200)',
                neutral: 'oklch(30% 0.01 285)',
                'neutral-content': 'oklch(96% 0.002 285)',
                info: 'oklch(52% 0.14 235)',
                'info-content': 'oklch(97% 0.012 235)',
                success: 'oklch(48% 0.12 155)',
                'success-content': 'oklch(97% 0.01 155)',
                warning: 'oklch(60% 0.13 80)',
                'warning-content': 'oklch(16% 0.03 80)',
                error: 'oklch(50% 0.19 27)',
                'error-content': 'oklch(97% 0.012 27)',
            },
            radius: { selector: '0.375rem', field: '0.375rem', box: '0.75rem' },
            size: { selector: '0.25rem', field: '0.25rem' },
            border: '1px',
            disabledOpacity: '0.4',
        },
        'basic-dark': {
            colorScheme: 'dark',
            pair: 'basic',
            softMix: 0.16,
            colors: {
                'base-100': 'oklch(21% 0.012 285)',
                'base-200': 'oklch(25% 0.013 285)',
                'base-300': 'oklch(30% 0.014 285)',
                'base-content': 'oklch(93% 0.004 286)',
                primary: 'oklch(70% 0.16 262)',
                'primary-content': 'oklch(17% 0.04 262)',
                secondary: 'oklch(72% 0.14 300)',
                'secondary-content': 'oklch(17% 0.04 300)',
                accent: 'oklch(74% 0.12 200)',
                'accent-content': 'oklch(17% 0.03 200)',
                neutral: 'oklch(35% 0.01 285)',
                'neutral-content': 'oklch(93% 0.003 285)',
                info: 'oklch(74% 0.13 235)',
                'info-content': 'oklch(18% 0.04 235)',
                success: 'oklch(74% 0.14 155)',
                'success-content': 'oklch(18% 0.04 155)',
                warning: 'oklch(80% 0.14 80)',
                'warning-content': 'oklch(20% 0.04 80)',
                error: 'oklch(68% 0.17 27)',
                'error-content': 'oklch(17% 0.04 27)',
            },
            radius: { selector: '0.375rem', field: '0.375rem', box: '0.75rem' },
            size: { selector: '0.25rem', field: '0.25rem' },
            border: '1px',
            disabledOpacity: '0.4',
        },
    },
};
