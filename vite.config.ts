import { defineConfig } from 'vite'

// Client-only sandbox. No SSR/hydration — an Obsidian plugin renders entirely
// in the Electron renderer, so we mirror that: a single client bundle mounted
// into #app, exactly like ItemView.onOpen() mounts into contentEl.
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  optimizeDeps: {
    // Arrow ships pre-built ESM; let Vite serve it as-is rather than pre-bundle.
    exclude: ['@arrow-js/core', '@arrow-js/framework'],
  },
})
