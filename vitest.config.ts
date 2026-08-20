import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Unit/component test config. Runs in Docker (see docker-compose `test`).
// Coverage thresholds are deliberately HIGH — this project is built TDD-first.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Cover application source only. Entry/bootstrap and generated/config
      // files carry no logic worth gating on.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/a11y.test.tsx',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        // Type-only modules are fully erased at compile time — no runtime code
        // to execute, so they cannot and need not be "covered".
        'src/**/types.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
})
