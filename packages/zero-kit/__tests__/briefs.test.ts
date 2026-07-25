/**
 * The brief pack is documentation that runs.
 *
 * A style brief written only as prose goes stale silently — that is exactly
 * how the skill came to describe a `system.text` category that had moved two
 * releases earlier (#9). So every brief in `skills/design-system/briefs/` is
 * a real `TokensInput` plus a real `RecipeInput`, validated and compiled here.
 * A brief that stops compiling is a failing test, not a trap for whoever
 * copies it next.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDesignSystem, validateDesignSystem, tokenProperty, TOKEN_CATEGORIES } from '@sigx/zero-kit';
import type { DesignSystemInput, ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import * as brutalist from '../skills/design-system/briefs/brutalist.js';
import * as glass from '../skills/design-system/briefs/glass.js';
import * as corporate from '../skills/design-system/briefs/corporate.js';
import * as terminal from '../skills/design-system/briefs/terminal.js';
import { system as brutalistPackageSystem } from '../../zero-brutalist/src/tokens.js';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

/** Every brief exports the same four things, in the same shape. */
const PACK = [brutalist, glass, corporate, terminal];

const compile = (brief: (typeof PACK)[number]): ReturnType<typeof compileDesignSystem> =>
    compileDesignSystem(
        { name: brief.brief.id, tokens: brief.tokens, recipes: [brief.button] } as DesignSystemInput,
        manifest,
    );

describe.each(PACK.map((b) => [b.brief.id, b] as const))('brief: %s', (id, brief) => {
    const ds = { name: id, tokens: brief.tokens, recipes: [brief.button] } as DesignSystemInput;
    const result = validateDesignSystem(ds, manifest);

    it('validates with no errors', () => {
        expect(result.errors.map((e) => `${e.where}: ${e.message}`)).toEqual([]);
    });

    it('has no warning other than the components it deliberately leaves to you', () => {
        // A brief is a starting point: tokens in full, and Button as the one
        // worked recipe. Every other component being unstyled is the expected
        // state, so it is the only warning allowed — a contrast failure or a
        // literal duration would surface here.
        const unexpected = result.warnings.filter((w) => !w.message.includes('have no recipe'));
        expect(unexpected.map((w) => `${w.where}: ${w.message}`)).toEqual([]);
    });

    it('compiles tokens and its Button recipe', () => {
        const compiled = compile(brief);
        expect(compiled.tokensCss).toContain(':root');
        expect(compiled.componentCss.button).toBeTruthy();
    });

    it('fills every scale it touches, rather than leaving half a ramp', () => {
        // A partial scale is legal — base.css covers the rest — but a
        // copy-paste starting point handing you three of five shadow steps is
        // a trap, so a category a brief uses at all must be complete.
        // `font` is exempt: it is a set of alternatives, not a ramp. A design
        // system with no serif face has made a decision, not left a hole.
        const css = compile(brief).tokensCss;
        const partial = TOKEN_CATEGORIES.filter((c) => c.shape === 'scale' && c.id !== 'font').flatMap((c) => {
            const missing = c.recommended.filter((key) => !css.includes(`${tokenProperty(c, key)}:`));
            return missing.length > 0 && missing.length < c.recommended.length
                ? [`${c.id}: missing ${missing.join(', ')}`]
                : [];
        });
        expect(partial).toEqual([]);
    });
});

describe('each brief is a different set of decisions, not a repaint', () => {
    it('gives every brief its own type ratio', () => {
        const ratios = PACK.map((b) => (b.system.typography as { scale: { ratio: number } }).scale.ratio);
        expect(new Set(ratios).size).toBe(PACK.length);
    });

    it('gives every brief its own radius and border', () => {
        const shapes = PACK.map((b) => `${b.system.radius.box}/${b.system.border}`);
        expect(new Set(shapes).size).toBe(PACK.length);
    });

    it('teaches a distinct mechanic in each', () => {
        expect(new Set(PACK.map((b) => b.brief.teaches)).size).toBe(PACK.length);
    });
});

describe('the signature move of each brief survives compilation', () => {
    it('glass frosts every surface through declared custom tokens', () => {
        const css = compile(glass).tokensCss;
        // Declared, not smuggled in through `extra`: it gets an @property
        // registration and a per-theme value in both schemes.
        expect(css).toContain("@property --glass-blur { syntax: '<length>';");
        expect(css).toMatch(/--glass-blur: 16px/);
        expect(css).toMatch(/--glass-blur: 22px/);
        expect(compile(glass).componentCss.button).toContain('backdrop-filter: blur(var(--glass-blur))');
    });

    it('terminal is instant without any recipe opting out of reduced motion', () => {
        const durations = terminal.system.motion.durations;
        expect(Object.values(durations).every((d) => d === '0ms')).toBe(true);
        const button = compile(terminal).componentCss.button!;
        expect(button).toContain('var(--duration-fast)');
        expect(button).not.toContain('transition: none');
    });

    it('terminal declares its glow per theme, where the colour lives', () => {
        // Writing it once as `0 0 16px var(--color-primary)` in `system` is
        // the obvious thing and it is wrong: a role is @property-registered,
        // so the reference resolves at :root and the glow stays green on the
        // amber theme. Measured in a browser, then fixed here and guarded by
        // the validator rule below.
        const css = compile(terminal).tokensCss;
        expect(Object.values(terminal.system.shadow).some((s) => s.includes('var(--color-'))).toBe(false);
        expect(css).toMatch(/\[data-theme="terminal"\][\s\S]*?--shadow-lg: 0 0 16px 0 oklch\(82% 0\.19 145\)/);
        expect(css).toMatch(/\[data-theme="paper"\][\s\S]*?--shadow-lg: 0 0 16px 0 oklch\(48% 0\.13 60 \/ 0\.5\)/);
    });

    it('warns when a design-system-level token reads a colour role', () => {
        const frozen = {
            ...terminal.tokens,
            system: { ...terminal.system, shadow: { ...terminal.system.shadow, md: '0 0 8px 0 var(--color-primary)' } },
        };
        const messages = validateDesignSystem(
            { name: 'frozen', tokens: frozen, recipes: [] } as unknown as DesignSystemInput,
            manifest,
        ).warnings.map((w) => w.message);
        expect(messages.some((m) => m.includes('resolves once at :root'))).toBe(true);
        // A base surface is not registered, so it is not flagged — that is the
        // shape @sigx/zero-brutalist ships, and it was verified working.
        const inked = {
            ...terminal.tokens,
            system: { ...terminal.system, shadow: { ...terminal.system.shadow, md: '5px 5px 0 0 var(--color-base-content)' } },
        };
        const inkedMessages = validateDesignSystem(
            { name: 'inked', tokens: inked, recipes: [] } as unknown as DesignSystemInput,
            manifest,
        ).warnings.map((w) => w.message);
        expect(inkedMessages.some((m) => m.includes('resolves once at :root'))).toBe(false);
    });

    it('corporate layers a contact shadow under an ambient one', () => {
        const { shadow } = corporate.system;
        expect(shadow.sm.split(',').length).toBe(2);
        expect(shadow.xl.split(',').length).toBe(2);
    });

    it('brutalist draws its shadows in ink, with no blur', () => {
        for (const value of Object.values(brutalist.system.shadow)) {
            expect(value).toMatch(/^\d+px \d+px 0 0 var\(--color-base-content\)$/);
        }
    });
});

describe('the pack stays true to what it documents', () => {
    const skill = readFileSync(resolve(process.cwd(), 'packages/zero-kit/skills/design-system/SKILL.md'), 'utf8');

    it.each(PACK.map((b) => [b.brief.id, b] as const))(
        'the cheat-sheet row for %s matches the file',
        (id, brief) => {
            // The table is the first thing an agent reads and the file is what
            // it copies. Drift between them is the failure this pack exists to
            // prevent, so the two are compared rather than trusted.
            const row = skill.split('\n').find((line) => line.startsWith(`| ${id} |`));
            expect(row, `no cheat-sheet row for "${id}"`).toBeTruthy();
            const cells = row!.split('|').map((c) => c.trim());
            const plain = (cell: string): string => cell.replaceAll('`', '');
            expect(cells[2], 'radius cell').toBe(brief.system.radius.box);
            expect(cells[3], 'border cell').toBe(brief.system.border);
            expect(plain(cells[4]!), 'signature cell').toBe(brief.brief.signature);
            expect(plain(cells[5]!), 'teaches cell').toBe(brief.brief.teaches);
        },
    );

    it('describes the brutalist brief as the package it excerpts', () => {
        // `brutalist.ts` says its `system` is the one `@sigx/zero-brutalist`
        // declares. If the package moves on, that sentence becomes a lie.
        expect(brutalist.system).toEqual(brutalistPackageSystem);
    });
});
