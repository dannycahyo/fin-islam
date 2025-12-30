import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.*',
        '**/__mocks__/**',
        '**/__tests__/**',
        '**/types.ts',
        '**/db/schema.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.vite'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
