import { defineConfig } from 'vitest/config'
import { loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { accountMayPass } from './src/gate-account'
import { GATE_COOKIE, gateToken, readCookie } from './src/gate-token'
import { handleWaitlist, type WaitlistEnv } from './src/waitlist-join'

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk: Buffer | string) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
  })
}

/**
 * The gate and the waitlist, served locally. On Vercel these are api/gate.ts,
 * api/session.ts, api/logout.ts and api/waitlist.ts. Here the same routes run
 * inside Vite, dev and preview. With SITE_PASSWORD empty, /learn/ is open
 * and the session is always in. /api/gate opens only for a signed-in account.
 */
function gateDev(secret: string, waitlist: WaitlistEnv, account: { url: string; anon: string }): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local')
    if (url.pathname === '/learn') {
      res.statusCode = 308
      res.setHeader('Location', `/learn/${url.search}`)
      res.end()
      return
    }
    if (!url.pathname.startsWith('/api/')) return next()
    const json = (status: number, body: unknown, cookie?: string) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      if (cookie) res.setHeader('Set-Cookie', cookie)
      res.end(JSON.stringify(body))
    }
    void (async () => {
      if (url.pathname === '/api/session' && req.method === 'GET') {
        const got = readCookie(req.headers.cookie ?? null, GATE_COOKIE)
        return json(200, { in: !secret || got === (await gateToken(secret)) })
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        return json(200, { ok: true }, `${GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
      }
      if (url.pathname === '/api/gate' && req.method === 'POST') {
        const openedByAccount = await accountMayPass(req.headers.authorization ?? null, account)
        if (!openedByAccount) return json(401, { ok: false })
        const token = await gateToken(secret || 'open')
        return json(200, { ok: true }, `${GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
      }
      if (url.pathname === '/api/waitlist' && req.method === 'POST') {
        const raw = await readBody(req)
        // The browser's own headers, so the check that refuses other sites runs here as on Vercel.
        const passed: Record<string, string> = {}
        for (const name of ['content-type', 'origin', 'sec-fetch-site']) {
          const value = req.headers[name]
          if (typeof value === 'string') passed[name] = value
        }
        if (req.headers.host) passed['x-forwarded-host'] = req.headers.host
        const response = await handleWaitlist(
          new Request('http://local/api/waitlist', { method: 'POST', headers: passed, body: raw }),
          waitlist,
        )
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(await response.text())
        return
      }
      next()
    })().catch(() => json(500, { ok: false }))
  }
  return {
    name: 'gate-dev',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    appType: 'mpa',
    plugins: [
      react(),
      VitePWA({
        disable: process.env.VITEST === 'true',
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'favicon.ico',
          'icons/apple-touch-icon.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-512.png',
        ],
        manifest: {
          id: '/',
          name: 'rian gèng',
          short_name: 'riankeng',
          description: 'Learn Thai as Thais speak it.',
          theme_color: '#f2ead8',
          background_color: '#f2ead8',
          display: 'standalone',
          start_url: '/learn/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            // ก่ drawn smaller, inside the circle a launcher's mask always keeps. scripts/gen-brand.py.
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          // The landing page and its drawings are never part of the app's precache.
          // Nor are the gallery and the candidate art it shows.
          globIgnores: [
            'index.html',
            'privacy.html',
            'terms.html',
            '404.html',
            'og.png',
            'preview/**',
            'gallery/**',
            'scenes/**',
            'assets/landing-*',
            'assets/gallery-*',
            'assets/candidates/**',
          ],
          navigateFallback: '/learn/index.html',
          navigateFallbackAllowlist: [/^\/learn\//],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === 'navigate' && (url.pathname === '/learn' || url.pathname.startsWith('/learn/')),
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
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/scenes/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'riankeng-scenes',
                // Her day draws 41 panels and the home two more, each in two sizes.
                expiration: { maxEntries: 130, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Her voice, offline. A sitting fetches its clips whole as it opens (warmClips); playback
              // asks in byte ranges, which rangeRequests answers from the whole clip in the cache.
              urlPattern: ({ url }) => url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'riankeng-audio',
                expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 180 },
                cacheableResponse: { statuses: [200] },
                rangeRequests: true,
              },
            },
          ],
        },
      }),
      gateDev(
        env.SITE_PASSWORD ?? '',
        {
          url: env.SUPABASE_URL ?? '',
          key: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        },
        {
          url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
          anon: env.VITE_SUPABASE_ANON_KEY ?? '',
        },
      ),
    ],
    resolve: {
      alias: {
        '@content': fileURLToPath(new URL('./content', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        input: {
          landing: fileURLToPath(new URL('./index.html', import.meta.url)),
          privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
          terms: fileURLToPath(new URL('./terms.html', import.meta.url)),
          notFound: fileURLToPath(new URL('./404.html', import.meta.url)),
          preview: fileURLToPath(new URL('./preview/index.html', import.meta.url)),
          gallery: fileURLToPath(new URL('./gallery/index.html', import.meta.url)),
          learn: fileURLToPath(new URL('./learn/index.html', import.meta.url)),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          // Candidate art gets its own folder, so the precache can leave it out by path.
          assetFileNames: (asset) =>
            asset.originalFileNames.some((f) => f.includes('art/candidates/'))
              ? 'assets/candidates/[name]-[hash][extname]'
              : 'assets/[name]-[hash][extname]',
        },
      },
    },
    test: {
      environment: 'happy-dom',
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    },
  }
})
