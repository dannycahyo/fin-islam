import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../vitest.config.base.js';
import { resolve } from 'path';

// Set test environment BEFORE loading any modules
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/islamic_finance_test';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      root: __dirname,
      environment: 'node',
      include: ['__tests__/integration/api/**/*.test.ts'],
      exclude: [
        '__tests__/unit/**',
        '__tests__/integration/vector-search*.test.ts',
        '__tests__/integration/document-workflow.test.ts',
      ],
      setupFiles: ['__tests__/integration-setup.ts'],
      fileParallelism: false,
      testTimeout: 30000,
      hookTimeout: 60000,
      coverage: {
        include: ['controllers/**', 'routes/**', 'app.ts'],
        exclude: ['**/__tests__/**', '**/__mocks__/**'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
      },
    },
  })
);
