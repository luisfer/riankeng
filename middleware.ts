import { next } from '@vercel/functions'
import { decideGate } from './src/gate-token'

const SHELL = { 'X-Riankeng-Shell': '1' }

/** The course at /learn/ and its audio sit behind the password. The landing at / is public. */
export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const decision = await decideGate(
    url.pathname,
    request.headers.get('cookie'),
    process.env.SITE_PASSWORD,
    Boolean(process.env.VERCEL),
  )
  if (decision.kind === 'pass') return next()
  if (decision.kind === 'shell') return next({ headers: SHELL })
  return Response.redirect(new URL(decision.to, request.url), 307)
}

export const config = {
  runtime: 'edge',
  matcher: ['/learn', '/learn/:path*', '/audio/:path*'],
}
