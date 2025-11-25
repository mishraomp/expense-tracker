import { defineConfig } from 'vitest/config';
import path from 'path';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Focus coverage on the service layer (business logic) only
      include: ['src/modules/**/*.service.ts'],
      // Exclude framework/bootstrap and other non-business code
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/prisma/**',
        'src/common/**',
        'src/**/*.controller.ts',
        'src/**/*.guard.ts',
        'src/**/*.filter.ts',
        'src/**/*.interceptor.ts',
      ],
      // Focus on service-layer statements/lines while setting branch threshold slightly lower
      thresholds: { statements: 80, branches: 50, functions: 80, lines: 80 },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
