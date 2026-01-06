import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for static deployment compatibility
  build: {
    outDir: 'dist-static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        playground: resolve(__dirname, 'playground.html'),
        docs: resolve(__dirname, 'docs.html'),
        test_cdn: resolve(__dirname, 'test-cdn.html'),
        test_npm: resolve(__dirname, 'test-npm.html')
      },
    },
  },
});
