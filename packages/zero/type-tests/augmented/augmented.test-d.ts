/**
 * The AUGMENTED contract — `./register.d.ts` augments `@sigx/zero` exactly
 * the way a generated `/register` module does (docs/architecture.md, "The
 * register artifact"), and every
 * narrowing case class is asserted, positive and negative.
 *
 * The augmentation targets `@sigx/zero` while `ZeroVocabulary` is DECLARED in
 * `contract/vocabulary.ts` and re-exported — so this project is also the
 * regression test that interface merging works through the re-export (the
 * `@vue/runtime-core` landmine).
 */
import type {
    AxesFor,
    ColorValue,
    ModsFor,
    ColorValueFor,
    SizeScaleFor,
    VariantValueFor,
    ZeroScope,
    ZeroVocabulary,
} from '@sigx/zero';
import type { Equal, MustBeTrue } from '../assert.js';

// ── fully wired: closed unions, typos rejected ──
const color: ColorValueFor<'button'> = 'primary';
// @ts-expect-error — a typo is no longer a silently minted value
const typo: ColorValueFor<'button'> = 'primry';
// @ts-expect-error — a role outside what THIS design system wires errors too
const unwired: ColorValueFor<'button'> = 'success';
const size: SizeScaleFor<'button'> = 'md';
const variant: VariantValueFor<'button'> = 'ghost';
// @ts-expect-error — variant is a closed set once wired
const badVariant: VariantValueFor<'button'> = 'ghots';

// ── empty declared axes must reject everything (Record<string, never>) ──
const noAxes: AxesFor<'button'> = {};
// @ts-expect-error — `{}` emission would silently permit this; Record<string, never> must not
const mintedAxis: AxesFor<'button'> = { density: 'compact' };

// ── partially wired: each axis narrows independently ──
const toggleColor: ColorValueFor<'toggle'> = 'secondary';
// @ts-expect-error — toggle wires no variant, so ANY value errors (never)
const toggleVariant: VariantValueFor<'toggle'> = 'solid';

// ── modifiers: presence-only, so the value type is boolean and the NAMES
//    are the vocabulary ──
const mods: ModsFor<'button'> = { block: true, 'icon-only': false };
// @ts-expect-error — a modifier this design system never declared
const mintedMod: ModsFor<'button'> = { wide: true };
// @ts-expect-error — a modifier has no vocabulary of values; it is on or off
const valuedMod: ModsFor<'button'> = { block: 'yes' };
// @ts-expect-error — toggle declares no modifiers, so Record<string, never> rejects every entry
const noMods: ModsFor<'toggle'> = { block: true };

// ── custom axes narrow per axis name and value ──
const density: AxesFor<'tabs'> = { density: 'compact' };
// @ts-expect-error — a value outside the declared axis vocabulary
const badDensity: AxesFor<'tabs'> = { density: 'tigth' };
// @ts-expect-error — an axis this design system never declared
const badAxis: AxesFor<'tabs'> = { emphasis: 'high' };

// ── nothing wired: the visible break, not the open fallback ──
// @ts-expect-error — checkbox accepts data-color at runtime, but nothing wires it
const checkboxColor: ColorValueFor<'checkbox'> = 'success';

// ── a scope ABSENT from the vocabulary falls back to the open union: the
//    guard-ordering case — `[Scoped<S>] extends [never]` must come first,
//    or this would collapse into the checkbox case above ──
export type _absentScopeFallsBack = MustBeTrue<Equal<ColorValueFor<'avatar'>, ColorValue>>;

// ── the generated file's scope-validity assertion (docs/architecture.md,
//    "The register artifact"):
//    every components key must be a real anatomy scope ──
export type _scopesValid = MustBeTrue<
    keyof ZeroVocabulary['components'] extends ZeroScope ? true : false
>;
type BadRegister = { button: object; checkbxo: object };
// @ts-expect-error — a typo'd scope fails the assertion instead of silently un-narrowing
export type _badScopesCaught = MustBeTrue<keyof BadRegister extends ZeroScope ? true : false>;

export { color, size, variant, noAxes, toggleColor, density };
export { typo, unwired, badVariant, mintedAxis, toggleVariant, badDensity, badAxis, checkboxColor };
