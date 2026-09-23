import { GATE_COOKIE } from '../src/gate-token'

/** Clears the site password on this browser. Cards stay on the device. */
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
