import { defineConfig } from 'vite';

export default defineConfig({
    base: 'Brno-Bold-2024', // Repository name
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
