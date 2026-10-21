/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build also works under a GitHub Pages subpath.
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'sim/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
    // The sims' tests run 2 to 4 s alone; a busy machine (a merge, a build, another session's
    // sims) pushed a dozen past the 5 s default (review 2026-10-21). A real hang still ends.
    testTimeout: 30_000,
  },
});
