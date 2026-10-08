import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import imagetools from 'vite-plugin-image-tools';
import path from 'path';

const localFunctionsPlugin = () => ({
  name: 'local-functions-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (url === '/api/submit-form' || url === '/.netlify/functions/submit-form') {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.statusCode = 204;
          return res.end();
        }
        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const { handler } = await server.ssrLoadModule('./netlify/functions/submit-form.js');
              const result = await handler({
                httpMethod: 'POST',
                headers: req.headers,
                body: bodyStr,
                isBase64Encoded: false,
              });
              res.statusCode = result.statusCode || 200;
              if (result.headers) {
                Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
              }
              res.end(result.body);
            } catch (err) {
              console.error('Local submit-form execution error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    localFunctionsPlugin(),
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
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
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

