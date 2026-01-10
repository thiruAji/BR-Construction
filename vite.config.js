import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fast refresh for development
      fastRefresh: true,
      // Remove unnecessary babel transforms
      jsxRuntime: 'automatic'
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Construction Site Manager',
        short_name: 'SiteManager',
        description: 'Track construction site expenses and progress',
        theme_color: '#2c3e50',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    // Modern build optimizations
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor': ['react', 'react-dom']
        }
      }
    },
    // Larger chunks = faster loading for small apps
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false
  },
  server: {
    port: 5173,
    open: true,
    // Optimize HMR for faster development
    middlewareMode: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  }
})
