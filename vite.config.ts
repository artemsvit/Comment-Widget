import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CommentWidget',
      // Ensure we export as default for UMD
      formats: ['es', 'umd', 'iife'],
      fileName: (format) => `comment-widget.${format === 'es' ? 'esm' : format}.js`,
    },
    rollupOptions: {
      // external: ['react', 'react-dom'],
      output: {
        // globals: {
        //   react: 'React',
        //   'react-dom': 'ReactDOM',
        // },
        assetFileNames: 'comment-widget.[ext]',
        // Ensure IIFE has a proper global name
        name: 'CommentWidget',
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
});

