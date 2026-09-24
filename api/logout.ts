import { GATE_COOKIE } from '../src/gate-token.js'

/** Clears the course sign-in cookie. The account password stays in Supabase. */
export async function POST(): Promise<Response> {
  const secure = process.env.VERCEL ? '; Secure' : ''
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `${GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      },
    },
  )
}
