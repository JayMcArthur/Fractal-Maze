import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export default defineConfig({
  plugins: [svelte()],
  base: './',
  resolve: {
    alias: {
      '@logic-core': resolve(here, 'src/logic-core'),
      '@runtime': resolve(here, 'src/runtime'),
      '@visual': resolve(here, 'src/visual'),
      '@packages': resolve(here, 'src/packages'),
    },
  },
  server: {
    fs: {
      allow: [here, repoRoot],
    },
  },
  publicDir: resolve(repoRoot, 'packages/browser'),
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
});
