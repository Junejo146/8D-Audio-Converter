import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    watch: {
      ignored: ['**/android/**', '**/dist/**', '**/.git/**']
    }
  },
  build: {
    outDir: 'dist'
  }
});
