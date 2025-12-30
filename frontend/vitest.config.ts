import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../vitest.config.base.js';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  mergeConfig(
    baseConfig,
    defineConfig({
      test: {
        root: __dirname,
        environment: 'jsdom',
        setupFiles: ['__tests__/setup.ts'],
        coverage: {
          include: ['app/**/*.{ts,tsx}'],
          exclude: ['**/__tests__/**', '**/*.d.ts', 'app/routes/**'],
        },
      },
    })
  )
);
