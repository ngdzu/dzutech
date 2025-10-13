import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'server/dist/**',
        'server/scripts/**',
        'scripts/**',
        '**/*.config.js',
        '**/*.config.ts',
        // exclude test files and test folders from coverage reporting
        '**/*.test.*',
        '**/*.spec.*',
        'src/**/__tests__/**',
      ],
    },
  },
})
