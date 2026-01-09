import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import imagetools from 'vite-plugin-image-tools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    imagetools({
      // defaultDirectives: (url) => {
      //   if (url.searchParams.has('responsive')) {
      //     return new URLSearchParams('w=300;600;900;1200&format=webp&as=srcset')
      //   }
      //   return new URLSearchParams()
      // }
    }),
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
        quality: 80,
      },
      avif: {
        quality: 70,
      },
    }),
  ],
  server: {
    port: 3002,
  },
})
