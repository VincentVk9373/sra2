import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/module/**/*.ts'],
      exclude: ['src/module/**/__tests__/**', 'src/module/migration/**'],
    },
  },
  resolve: {
    extensions: ['.ts', '.mjs', '.js', '.json'],
  },
});
