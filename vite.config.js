import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import tailwindcss from '@tailwindcss/vite';
import { godseyeBackendPlugin } from './server/vitePlugin.mjs';

export default defineConfig({
  plugins: [
    godseyeBackendPlugin(),
    react(),
    cesium(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
