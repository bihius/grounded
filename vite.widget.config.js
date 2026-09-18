import { defineConfig } from 'vite';

/**
 * The widget builds separately from the application: an embedded script needs a
 * stable address (`/widget.js`), not a hashed name from the Vite manifest.
 * Run it with `npm run build:widget`.
 */
export default defineConfig({
    publicDir: false,
    build: {
        outDir: 'public',
        emptyOutDir: false,
        lib: {
            entry: 'resources/js/widget.ts',
            formats: ['iife'],
            name: 'GroundedWidget',
            fileName: () => 'widget.js',
        },
    },
});
