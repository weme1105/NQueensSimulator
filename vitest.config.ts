import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/solver/engine.ts',
        'src/solver/generator.ts',
        'src/solver/pipeline.ts',
        'src/solver/types.ts',
        'src/puzzleRules.ts',
        'src/regionEditRules.ts',
        'src/playPointerGuard.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
