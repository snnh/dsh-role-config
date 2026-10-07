import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    server: {
      deps: {
        // The Host packages are linked from a dsh checkout; processing them
        // with the test runner keeps one copy of each shared service class
        // (notably @deepseek-ai/cordis) alive across the graph.
        inline: [/@deepseek-ai\//],
      },
    },
  },
})
