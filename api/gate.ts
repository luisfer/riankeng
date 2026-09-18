const GATE_COOKIE = 'rk_gate'

async function gateToken(secret: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.SITE_PASSWORD
  if (!secret) return Response.json({ ok: false, error: 'Gate is not configured.' }, { status: 503 })

  let password = ''
  const ctype = request.headers.get('content-type') ?? ''
  if (ctype.includes('application/json')) {
    const body = (await request.json()) as { password?: string }
    password = body.password ?? ''
  } else {
    const form = await request.formData()
    password = String(form.get('password') ?? '')
  }

  if (password !== secret) return Response.json({ ok: false }, { status: 401 })

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
