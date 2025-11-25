import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Focus on frontend service & store business logic only
      include: ['src/services/**/*.ts', 'src/stores/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/components/**',
        'src/features/**/components/**',
        'src/routes/**',
        'src/**/*.css',
        'src/**/*.scss',
      ],
      // Keep statements/lines at 80, relax branches to 50 for incremental test coverage
      thresholds: { statements: 80, branches: 50, functions: 80, lines: 80 },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
