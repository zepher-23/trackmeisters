import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      /* 
         Detailed configuration to ensure aggressive optimization 
         because the user requested size reduction.
      */
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      exclude: undefined,
      include: undefined,
      includePublic: true, // Process public directory assets
      logStats: true,
      png: {
        // Encodes the image to use a palette (quantization) if possible 
        // to reduce size significantly.
        palette: true,
        quality: 80,
        compressionLevel: 9,
      },
      jpeg: {
        quality: 75,
      },
      jpg: {
        quality: 75,
      },
      // Ensure specific quality for others
      webp: {
        lossless: true,
      },
      avif: {
        lossless: true,
      },
    }),
  ],
  server: {
    port: 3002,
  },
})
