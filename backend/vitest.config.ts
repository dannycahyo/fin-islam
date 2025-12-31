import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../vitest.config.base.js';
import { resolve } from 'path';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      root: __dirname,
      environment: 'node',
      setupFiles: ['__tests__/setup.ts'],
      fileParallelism: false,
      coverage: {
        include: ['services/**', 'lib/**', 'routes/**'],
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
