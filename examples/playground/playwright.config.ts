import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser interaction suite for the press-feedback contract.
 *
 * The unit tests (happy-dom) prove the handler logic; this suite proves the
 * parts a simulated DOM cannot: real pointer/keyboard/touch input, pointer
 * capture during slider drags, `prefers-reduced-motion` and `forced-colors`
 * as actual media queries, and the non-Blink engines.
 *
 * Needs `pnpm build` at the repo root first — the playground resolves each
 * design system's compiled CSS from its `dist/`.
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    // Generous by design: assertions poll an instrumentation log, and the
    // slowest engine under full parallel load decides the budget.
    expect: { timeout: 10_000 },
    use: {
        baseURL: 'http://localhost:5199',
    },
    webServer: {
        command: 'pnpm dev --port 5199',
        url: 'http://localhost:5199',
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        // hasTouch everywhere a touchscreen exists in the engine, so the
        // touch-tap test runs on real touch pointers, not emulated mice.
        { name: 'chromium', use: { ...devices['Desktop Chrome'], hasTouch: true } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'], hasTouch: true } },
        {
            name: 'reduced-motion',
            use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
        },
        {
            name: 'forced-colors',
            use: { ...devices['Desktop Chrome'], contextOptions: { forcedColors: 'active' } },
        },
    ],
});
