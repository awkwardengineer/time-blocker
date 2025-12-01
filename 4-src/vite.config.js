import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isTest = command === 'test' || mode === 'test'
  
  return {
    base: '/time-blocker/',
    plugins: [
      svelte(),
    ],
    build: {
      outDir: '../5-dist',
      emptyOutDir: true,
    },
    preview: {
      port: 4173,
    },
    publicDir: 'public',
    resolve: {
      conditions: ['browser', 'module', 'import'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.js'],
      passWithNoTests: true, // Allow build to proceed when no tests exist yet
      include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
      exclude: ['src/__tests__/print/**'], // Exclude Playwright e2e tests from Vitest
      resolve: {
        conditions: ['browser', 'module', 'import'],
        alias: {
          // Force Svelte to resolve to browser version during tests
          '^svelte$': resolve(__dirname, 'node_modules/svelte/src/index-client.js'),
        },
      },
      // Configure transform mode to use web (client-side) for all test files
      testTransformMode: {
        web: [/\.[jt]sx?$/, /\.svelte$/],
      },
      // Pre-bundle Svelte with browser version for tests
      deps: {
        inline: ['svelte'],
      },
    },
  }
})
