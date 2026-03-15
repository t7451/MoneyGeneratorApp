import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
// import { VitePWA } from 'vite-plugin-pwa'

type BundleItem = {
  fileName: string
  size: number
  type: 'asset' | 'chunk'
  isEntry: boolean
}

type BundleRule = {
  name: string
  maxSize: number
  matches: (fileName: string, item: BundleItem) => boolean
}

const kilobytes = (value: number) => value * 1024

const bundleRules: BundleRule[] = [
  {
    name: 'entry-js',
    maxSize: kilobytes(80),
    matches: (fileName, item) => item.type === 'chunk' && item.isEntry && fileName.endsWith('.js'),
  },
  {
    name: 'route-js',
    maxSize: kilobytes(50),
    matches: (fileName, item) =>
      item.type === 'chunk' &&
      !item.isEntry &&
      fileName.endsWith('.js') &&
      !fileName.includes('vendor-react') &&
      !fileName.includes('vendor-icons') &&
      !fileName.includes('ReportsCharts-') &&
      !fileName.includes('ReportsChartBuilder-') &&
      !fileName.includes('JobMap-') &&
      !fileName.includes('maplibre-gl-'),
  },
  {
    name: 'vendor-react',
    maxSize: kilobytes(200),
    matches: (fileName) => fileName.includes('vendor-react') && fileName.endsWith('.js'),
  },
  {
    name: 'vendor-icons',
    maxSize: kilobytes(30),
    matches: (fileName) => fileName.includes('vendor-icons') && fileName.endsWith('.js'),
  },
  {
    name: 'reports-charts-js',
    maxSize: kilobytes(450),
    matches: (fileName) =>
      (fileName.includes('ReportsCharts-') || fileName.includes('ReportsChartBuilder-')) && fileName.endsWith('.js'),
  },
  {
    name: 'job-map-js',
    maxSize: kilobytes(850),
    matches: (fileName) => fileName.includes('JobMap-') && fileName.endsWith('.js'),
  },
  {
    name: 'maplibre-js',
    maxSize: kilobytes(850),
    matches: (fileName) => fileName.includes('maplibre-gl-') && fileName.endsWith('.js'),
  },
  {
    name: 'entry-css',
    maxSize: kilobytes(80),
    matches: (fileName, item) => item.type === 'asset' && /^assets\/index-.*\.css$/.test(fileName),
  },
  {
    name: 'route-css',
    maxSize: kilobytes(20),
    matches: (fileName, item) =>
      item.type === 'asset' &&
      fileName.endsWith('.css') &&
      !/^assets\/index-.*\.css$/.test(fileName) &&
      !fileName.includes('JobMap-') &&
      !fileName.includes('Skeleton-'),
  },
  {
    name: 'job-map-css',
    maxSize: kilobytes(70),
    matches: (fileName, item) => item.type === 'asset' && fileName.includes('JobMap-') && fileName.endsWith('.css'),
  },
  {
    name: 'shared-css',
    maxSize: kilobytes(24),
    matches: (fileName, item) => item.type === 'asset' && fileName.includes('Skeleton-') && fileName.endsWith('.css'),
  },
]

function formatKilobytes(size: number) {
  return `${(size / 1024).toFixed(1)} kB`
}

function createBundleBudgetPlugin(strict: boolean): Plugin {
  return {
    name: 'bundle-budget-governance',
    apply: 'build',
    generateBundle(_, bundle) {
      const items: BundleItem[] = Object.values(bundle).map((entry) => {
        if (entry.type === 'asset') {
          const source = entry.source ?? ''
          const size = typeof source === 'string' ? Buffer.byteLength(source) : source.byteLength

          return {
            fileName: entry.fileName,
            size,
            type: 'asset',
            isEntry: false,
          }
        }

        return {
          fileName: entry.fileName,
          size: Buffer.byteLength(entry.code),
          type: 'chunk',
          isEntry: entry.isEntry,
        }
      })

      const violations = items.flatMap((item) => {
        const rule = bundleRules.find((candidate) => candidate.matches(item.fileName, item))
        if (!rule || item.size <= rule.maxSize) {
          return []
        }

        return [{
          fileName: item.fileName,
          rule: rule.name,
          actualSize: item.size,
          maxSize: rule.maxSize,
        }]
      })

      const largestItems = [...items]
        .sort((left, right) => right.size - left.size)
        .slice(0, 10)
        .map((item) => ({
          fileName: item.fileName,
          size: item.size,
          type: item.type,
          isEntry: item.isEntry,
        }))

      this.emitFile({
        type: 'asset',
        fileName: 'bundle-budget-report.json',
        source: JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            strict,
            rules: bundleRules.map((rule) => ({ name: rule.name, maxSize: rule.maxSize })),
            violations,
            largestItems,
          },
          null,
          2,
        ),
      })

      if (violations.length === 0) {
        this.warn(
          `[bundle-budget] All bundle budgets passed. Largest file: ${largestItems[0]?.fileName || 'n/a'} (${formatKilobytes(largestItems[0]?.size || 0)}).`,
        )
        return
      }

      const summary = violations
        .map(
          (violation) =>
            `${violation.fileName} exceeded ${violation.rule}: ${formatKilobytes(violation.actualSize)} > ${formatKilobytes(violation.maxSize)}`,
        )
        .join('\n')

      if (strict) {
        this.error(`[bundle-budget] Budget check failed:\n${summary}`)
      } else {
        this.warn(`[bundle-budget] Budget warnings:\n${summary}`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = mode === 'analyze'
  const strictBudgets = mode === 'budget'

  return {
    plugins: [
      react(),
      createBundleBudgetPlugin(strictBudgets),
      ...(shouldAnalyze
        ? [
            visualizer({
              filename: 'dist/bundle-analysis.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
      /* 
      // PWA Temporarily Disabled for Netlify Deployment Stability
      // The previous configuration was causing EISDIR errors during the build process
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, 
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
          globPatterns: ['**\/*.{js,css,html,woff2,png,svg,ico}'],
          maximumFileSizeToCacheInBytes: 5000000,
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
      */
    ],

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        '/auth': {
          target: process.env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        }
      }
    },

    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production',
      minify: 'esbuild',
      target: 'ES2020',
      chunkSizeWarningLimit: 850,
      
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
            'vendor-icons': ['lucide-react'],
            // 'vendor-utils': ['axios', 'zod'], // Removed as they are not used in web
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
  }
})
