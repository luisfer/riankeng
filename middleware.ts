import { next, rewrite } from '@vercel/functions'
import { GATE_COOKIE, gateToken, readCookie } from './src/gate-token'

const OPEN = [
  /^\/gate\.html$/,
  /^\/api\/gate$/,
  /^\/favicon\.svg$/,
  /^\/fonts\//,
  /^\/icons\//,
  /^\/sw\.js$/,
  /^\/manifest\.webmanifest$/,
  /^\/workbox-.*\.js$/,
]

const SHELL = { 'X-Riankeng-Shell': '1' }

export default async function middleware(request: Request) {
  const { pathname } = new URL(request.url)
  if (OPEN.some((re) => re.test(pathname))) return next()

  const secret = process.env.SITE_PASSWORD
  if (!secret) {
    if (process.env.VERCEL) return rewrite(new URL('/gate.html', request.url))
    return next({ headers: SHELL })
  }

  const got = readCookie(request.headers.get('cookie'), GATE_COOKIE)
  if (got && got === (await gateToken(secret))) return next({ headers: SHELL })
  return rewrite(new URL('/gate.html', request.url))
}

export const config = {
  runtime: 'edge',
  matcher: ['/((?!assets/).*)'],
}
