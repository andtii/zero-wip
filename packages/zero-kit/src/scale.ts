/**
 * Modular type scale — `{ base, ratio }` expanded into a `--text-*` ramp.
 *
 * A design system's type scale is a ratio, not seven unrelated numbers, and
 * stating it as one lets the whole ramp be retuned by changing the ratio.
 * Explicit `sizes` still win per key, so a hand-tuned display size can sit on
 * top of a generated ramp.
 */

/** `1rem` → `{ magnitude: 1, unit: 'rem' }`. */
const NUMERIC = /^\s*(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)\s*$/i;

export interface TypeScale {
    /** The value of the `origin` step. Every other step derives from it. */
    base: string;
    /** Ratio between adjacent steps — 1.125 minor third, 1.618 golden. */
    ratio: number;
    /** Step names, small to large. Defaults to the recommended ramp. */
    steps?: readonly string[];
    /** Which step carries `base`. Defaults to `md`, else the middle step. */
    origin?: string;
    /** Decimal places before trailing zeros are trimmed. Default 4. */
    precision?: number;
}

/**
 * Trim trailing zeros without touching an integer's own digits.
 *
 * `(100).toFixed(4)` is `"100.0000"`; a naive `/\.?0+$/` turns that into
 * `"1"`. Anchoring on the decimal point is the whole job here.
 */
function trim(value: string): string {
    return value.includes('.')
        ? value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
        : value;
}

export function generateTypeScale(
    scale: TypeScale,
    recommended: readonly string[],
): Record<string, string> {
    const parsed = NUMERIC.exec(scale.base);
    if (!parsed) {
        throw new Error(
            `[zero-kit] typography.scale.base must be a number with a unit, got "${scale.base}" — ` +
            'use typography.sizes for a clamp()/calc() ramp',
        );
    }
    const [, magnitude, unit] = parsed as unknown as [string, string, string];
    if (!unit) {
        throw new Error(`[zero-kit] typography.scale.base "${scale.base}" has no unit`);
    }
    if (!(scale.ratio > 1)) {
        throw new Error(
            `[zero-kit] typography.scale.ratio must be greater than 1, got ${scale.ratio} — ` +
            'a ratio of 1 or less produces a flat or inverted ramp',
        );
    }

    const steps = scale.steps ?? recommended;
    if (steps.length === 0) throw new Error('[zero-kit] typography.scale needs at least one step');

    const origin = scale.origin ?? (steps.includes('md') ? 'md' : steps[Math.floor(steps.length / 2)]!);
    const originIndex = steps.indexOf(origin);
    if (originIndex < 0) {
        throw new Error(
            `[zero-kit] typography.scale.origin "${origin}" is not one of steps: ${steps.join(', ')}`,
        );
    }

    const precision = scale.precision ?? 4;
    const start = Number(magnitude);
    return Object.fromEntries(steps.map((step, i) => {
        const value = start * scale.ratio ** (i - originIndex);
        const rounded = trim(value.toFixed(precision));
        // A step that rounds away to zero is invisible text, and nothing
        // downstream would complain: `0rem` is valid CSS. Catch it here,
        // where the cause (precision, or too many steps below the origin)
        // is still obvious.
        if (Number(rounded) === 0 && value !== 0) {
            throw new Error(
                `[zero-kit] typography.scale step "${step}" rounds to 0${unit} at precision ` +
                `${precision} (exact value ${value}) — raise precision, raise base, or use ` +
                'fewer steps below the origin',
            );
        }
        return [step, `${rounded}${unit}`];
    }));
}
