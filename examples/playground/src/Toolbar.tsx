/**
 * The switcher bar.
 *
 * Built from zero's own components, so the control restyles itself along with
 * everything it controls — which is the whole claim: one anatomy, four skins,
 * no component code touched.
 */
import { component, signal } from 'sigx';
import { Button, listThemes, themeController } from '@sigx/zero';
import {
    activateDesignSystem,
    activeDesignSystemId,
    designSystems,
    type DesignSystemEntry,
} from './design-systems';

export const Toolbar = component(() => {
    const state = signal({
        // Mirrors the live stylesheet. Updated only AFTER the swap resolves,
        // so the theme list below never renders against a registry that is
        // still holding the previous design system's themes.
        ds: activeDesignSystemId() ?? designSystems[0]!.id,
        busy: false,
    });

    const switchTo = async (id: string): Promise<void> => {
        const entry = designSystems.find((d) => d.id === id);
        if (!entry || entry.id === state.ds) return;
        state.busy = true;
        await activateDesignSystem(entry);
        state.ds = entry.id;
        state.busy = false;
    };

    return () => {
        const active: DesignSystemEntry =
            designSystems.find((d) => d.id === state.ds) ?? designSystems[0]!;
        // Read `state.ds` first (above) so this closure re-runs on a switch and
        // picks up the freshly re-seeded registry.
        const themes = listThemes();
        const current = themeController().theme();

        return (
            <header
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius-box)',
                    background: 'var(--color-base-200)',
                    color: 'var(--color-base-content)',
                    opacity: state.busy ? 0.6 : 1,
                }}
            >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>Design system</strong>
                    {designSystems.map((ds) => (
                        <Button.Root
                            size="sm"
                            variant={ds.id === active.id ? 'solid' : 'outline'}
                            disabled={state.busy}
                            onClick={() => void switchTo(ds.id)}
                        >
                            {ds.label}
                        </Button.Root>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>Theme</strong>
                    {themes.map((theme) => (
                        <Button.Root
                            size="sm"
                            variant={current === theme.name ? 'solid' : 'outline'}
                            onClick={() => themeController().setTheme(theme.name)}
                        >
                            <Swatch theme={theme.swatch} />
                            {theme.name}
                        </Button.Root>
                    ))}
                    <Button.Root
                        size="sm"
                        variant={current ? 'ghost' : 'solid'}
                        onClick={() => themeController().setTheme(null)}
                    >
                        system
                    </Button.Root>
                </div>

                <p
                    style={{
                        margin: 0,
                        marginInlineStart: 'auto',
                        fontSize: 'var(--text-sm)',
                        opacity: 0.75,
                    }}
                >
                    {active.blurb}
                    {' — '}
                    <code>{current ?? 'system'}</code>
                    {' / '}
                    <code>{themeController().resolvedScheme()}</code>
                </p>
            </header>
        );
    };
}, { name: 'Toolbar' });

/**
 * Renders the `swatch` colors every design system already publishes through
 * `installThemes()` — until now, nothing in the repo read them.
 *
 * Whatever the registry holds is drawn, in order, rather than a fixed set of
 * role names: the swatch is derived from each design system's own declaration,
 * so material's thirteen-role vocabulary shows different colours here than
 * basic's eight. Hardcoding `primary`/`neutral` would render every design
 * system's themes identically — the thing that derivation exists to prevent.
 */
const Swatch = component<{ theme?: Record<string, string> }>(({ props }) => () => {
    const colors = Object.values(props.theme ?? {});
    if (!colors.length) return null;
    return (
        <span
            aria-hidden="true"
            style={{
                display: 'inline-flex',
                marginInlineEnd: '0.375rem',
                verticalAlign: 'middle',
                borderRadius: '999px',
                overflow: 'hidden',
                outline: '1px solid var(--color-base-300)',
            }}
        >
            {colors.map((color) => (
                <span style={{ width: '0.375rem', height: '0.75rem', background: color }} />
            ))}
        </span>
    );
}, { name: 'Swatch' });
