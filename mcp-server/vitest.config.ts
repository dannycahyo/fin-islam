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
      coverage: {
        include: ['src/**'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  })
);
