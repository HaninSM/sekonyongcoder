import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          gsap: ['gsap'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
