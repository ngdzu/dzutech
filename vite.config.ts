import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
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
      ],
    },
  },
})
