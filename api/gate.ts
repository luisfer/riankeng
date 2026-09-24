import { accountMayPass } from '../src/gate-account.js'
import { GATE_COOKIE, gateToken } from '../src/gate-token.js'

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.SITE_PASSWORD
  if (!secret) return Response.json({ ok: false, error: 'Gate is not configured.' }, { status: 503 })

  const openedByAccount = await accountMayPass(request.headers.get('authorization'), {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    anon: process.env.VITE_SUPABASE_ANON_KEY || '',
  })
  if (!openedByAccount) return Response.json({ ok: false }, { status: 401 })

  const token = await gateToken(secret)
  const secure = process.env.VERCEL ? '; Secure' : ''
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `${GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
      },
    },
  )
}
