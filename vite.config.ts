import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Use "esbuild" or "terser" for minification; "esbuild" is faster.
    minify: 'esbuild',
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
});
