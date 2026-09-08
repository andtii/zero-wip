/**
 * `reduced-motion/loop` — a loop that never stops.
 *
 * The kit collapses every declared `--duration-*` to ~0 under
 * `prefers-reduced-motion`, which is right for a transition and wrong for a
 * LOOP: a spinner whose `animation` rides a token would spin absurdly fast
 * rather than settle, so the skill tells authors to leave a loop's duration
 * literal and stop it explicitly — `animation: none` under `reduced-motion`.
 * That instruction had no reader. The browser spec
 * (`e2e/reduced-motion.spec.ts`) asserts it for the two components whose
 * resting state is a loop (Skeleton, Spinner) in the six in-repo skins, in
 * both directions — `animation-name` running under chromium and `none` under
 * the reduced-motion project — because a one-way check passes a recipe that
 * never animated. An external design system never runs that spec.
 *
 * This is the static half, and only the half a static reader can honestly
 * claim: for every rule in the default render that declares an infinite
 * animation, there must be a rule for the SAME selector under
 * `@media (prefers-reduced-motion: reduce)` that declares `animation: none`
 * or `animation-name: none`. The same selector, not merely the same part —
 * `@media` adds no specificity, so a cancel on a broader selector than the
 * loop's loses the cascade and stops nothing. (`animation-play-state: paused`
 * is deliberately not accepted: it freezes a frame rather than removing the
 * loop, and the browser spec's `animation-name: none` is the contract.) The
 * "and it runs otherwise" direction stays with the browser: a static reader
 * can see that a loop is declared, not that it plays.
 */
import type { CssRule } from '../css-rules.js';
import type { AuditContext } from '../context.js';
import type { AuditFinding, RuleOutput } from '../types.js';

const isMedia = (prelude: string): boolean => prelude.startsWith('@media');
const isReducedMotion = (prelude: string): boolean =>
    isMedia(prelude) && /prefers-reduced-motion\s*:\s*reduce/.test(prelude);

/** The default render: `@layer` and `@scope` are structure; any `@media` is a condition. */
const isDefaultContext = (rule: CssRule): boolean => rule.at.every((p) => !isMedia(p));

const split = (decl: string): [string, string] => {
    const i = decl.indexOf(':');
    return [decl.slice(0, i).trim().toLowerCase(), decl.slice(i + 1).trim().toLowerCase()];
};

/** Does this rule start an animation that never ends? */
export const declaresLoop = (rule: CssRule): boolean =>
    rule.decls.some((d) => {
        const [prop, value] = split(d);
        return (prop === 'animation' || prop === 'animation-iteration-count') && /\binfinite\b/.test(value);
    });

/** Does this rule take the animation away? */
const stopsAnimation = (rule: CssRule): boolean =>
    rule.decls.some((d) => {
        const [prop, value] = split(d);
        return (prop === 'animation' && /^none\b/.test(value)) || (prop === 'animation-name' && value === 'none');
    });

/** The at-rule preludes that place a rule, with the media condition removed. */
const placement = (rule: CssRule): string => rule.at.filter((p) => !isMedia(p)).join(' ');

/** The part a rule's subject is, for the finding's `where`. */
const partOf = (rule: CssRule): string | undefined => {
    const parts = [...rule.selector.matchAll(/\[data-part="([^"]+)"\]/g)];
    return parts[parts.length - 1]?.[1];
};

export function loopFindings(scope: string, rules: readonly CssRule[]): AuditFinding[] {
    const out: AuditFinding[] = [];
    for (const loop of rules) {
        if (!isDefaultContext(loop) || !declaresLoop(loop)) continue;
        const stopped = rules.some((r) =>
            r.at.some(isReducedMotion)
            && r.selector === loop.selector
            && placement(r) === placement(loop)
            && stopsAnimation(r));
        if (stopped) continue;
        const part = partOf(loop);
        out.push({
            rule: 'reduced-motion/loop',
            severity: 'error',
            where: part ? `${scope}.${part}` : scope,
            scope,
            ...(part ? { part } : {}),
            message: `${part ? `${scope}.${part}` : scope}: \`${loop.selector}\` declares an infinite animation and `
                + `nothing stops it under prefers-reduced-motion — the kit collapses durations there, so a `
                + `loop strobes rather than settles. Add at: { 'reduced-motion': { … animation: 'none' } } `
                + `on the same part and state (the same selector: a cancel on a broader one loses the cascade).`,
        });
    }
    return out;
}

export function run(ctx: AuditContext): RuleOutput {
    const findings: AuditFinding[] = [];
    for (const [scope, rules] of ctx.cssRules) findings.push(...loopFindings(scope, rules));
    return { findings, waived: [] };
}
