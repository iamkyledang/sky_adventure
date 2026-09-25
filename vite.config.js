import { defineConfig } from 'vite';

// Relative base so the built site works regardless of the GitHub Pages
// sub-path it ends up published at (e.g. https://user.github.io/repo/).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
});
