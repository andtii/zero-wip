/**
 * A hand-written stand-in for a generated `dist/register.d.ts` (RFC 0002 §5)
 * — the shape `zero-kit build` will emit in phase 3. Kept small but covering
 * every case class: fully wired (button), partially wired (toggle: no
 * variant), wired custom axes (tabs), and nothing wired (checkbox).
 */
declare module '@sigx/zero' {
    interface ZeroVocabulary {
        theme: 'light' | 'dark' | 'dim';
        components: {
            /** button — colour, size and variant all wired. */
            button: {
                color: 'primary' | 'secondary' | 'accent';
                size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
                variant: 'solid' | 'outline' | 'soft' | 'ghost';
                axes: Record<string, never>;
            };
            /** toggle — colour and size wired, variant not. */
            toggle: {
                color: 'primary' | 'secondary';
                size: 'sm' | 'md';
                variant: never;
                axes: Record<string, never>;
            };
            /** tabs — a custom density axis. */
            tabs: {
                color: 'primary';
                size: never;
                variant: never;
                axes: { density: 'compact' | 'comfortable' };
            };
            /** checkbox — accepts the props at runtime, nothing wired. */
            checkbox: { color: never; size: never; variant: never; axes: Record<string, never> };
        };
    }
}
export {};
