import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import imagetools from 'vite-plugin-image-tools';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    {
      name: 'prevent-index-html-script-transform',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // If Netlify Dev or an SPA proxy rewrote a missing script/module request to /index.html,
          // prevent Vite from attempting to parse index.html as a JavaScript module.
          const isHtmlPath = req.url === '/index.html' || req.url?.startsWith('/index.html?');
          const isScriptReq =
            req.headers['sec-fetch-dest'] === 'script' ||
            (req.headers.accept &&
              !req.headers.accept.includes('text/html') &&
              req.headers.accept.includes('application/javascript'));

          if (isHtmlPath && isScriptReq) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Not found');
            return;
          }
          next();
        });
      },
    },
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
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})

