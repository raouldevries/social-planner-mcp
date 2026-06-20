import { defineConfig } from 'vitest/config';

// Pin the timezone before workers fork so date-formatting tests (e.g. the email
// invitation-expiry golden snapshot) are deterministic on every machine/CI.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/**/*.d.ts', 'src/server.ts', 'vitest.config.ts'],
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    // Ensure mocks are properly reset between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
