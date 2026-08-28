import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./github-pages-src', import.meta.url)),
  base: '/Marveto/',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist-pages', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./github-pages-src/index.html', import.meta.url)),
        axiom: fileURLToPath(new URL('./github-pages-src/concepts/axiom/index.html', import.meta.url)),
        serein: fileURLToPath(new URL('./github-pages-src/concepts/serein/index.html', import.meta.url)),
        forma: fileURLToPath(new URL('./github-pages-src/concepts/forma/index.html', import.meta.url)),
      },
    },
  },
});
