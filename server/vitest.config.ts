import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Load setup file to provide global mocks (e.g. S3 client) to avoid network calls during unit tests
    setupFiles: ['./test/setup.ts'],
  },
})
