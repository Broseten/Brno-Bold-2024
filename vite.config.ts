import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    build: {
        outDir: 'dist',
        // "esbuild" or "terser" for minification; "esbuild" is faster.
        minify: 'esbuild',
        rollupOptions: {
            output: {
                format: 'iife',
            },
        },
    },
});
