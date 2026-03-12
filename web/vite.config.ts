import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Money Generator App',
        short_name: 'MoneyGen',
        description: 'Earn money from multiple income sources',
        theme_color: '#10b981',
        background_color: '#1a1a1a',
        scope: '/',
        start_url: '/',
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'esbuild',
    target: 'ES2020',
    
    // Optimization options
    reportCompressedSize: false,
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
      },
    },

    // Code splitting strategy for better caching
    rollupOptions: {
      output: {
        // Vendor chunk
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['axios', 'zod'],
        },
        // Optimize chunk filenames
        chunkFileNames: 'assets/chunks/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8].[ext]',
      }
    }
  },

  preview: {
    port: 3000,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
