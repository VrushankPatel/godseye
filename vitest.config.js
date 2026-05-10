import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.js', 
      'tests/**/*.test.js',
      'tests/unit/**/*.test.js'
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});