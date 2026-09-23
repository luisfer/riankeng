import { GATE_COOKIE, gateToken, readCookie } from '../src/gate-token.js'

/** Is this browser signed in? The landing page asks, so it can say Open the course. */
export async function GET(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' }
  const secret = process.env.SITE_PASSWORD
  if (!secret) return Response.json({ in: !process.env.VERCEL }, { headers })
  const got = readCookie(request.headers.get('cookie'), GATE_COOKIE)
  return Response.json({ in: Boolean(got && got === (await gateToken(secret))) }, { headers })
}
