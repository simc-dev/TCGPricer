import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    maxWorkers: 1,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: [],
    coverage: { provider: 'v8' }
  }
});
