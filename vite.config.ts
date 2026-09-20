import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: process.env.VITEST === 'true',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'riian gèng',
        short_name: 'riankeng',
        description: 'Thai in romanization, then the letters.',
        theme_color: '#f2ead8',
        background_color: '#f2ead8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/gate.html'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /\/gate\.html$/, /\/sw\.js$/, /\/manifest\.webmanifest$/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !url.pathname.startsWith('/api/') && url.pathname !== '/gate.html',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'riankeng-shell',
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    if (!response || response.status !== 200) return null
                    if (response.headers.get('X-Riankeng-Shell') === '1') return response
                    const text = await response.clone().text()
                    if (text.includes('id="gate"') || text.includes('name="password"')) return null
                    if (text.includes('id="root"') || text.includes('name="riankeng-shell"')) return response
                    return null
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
