/** A signed-in account may open the course. The anon key is public. The service role stays out. */

export async function accountMayPass(
  authorization: string | null,
  env: { url: string; anon: string },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!authorization?.startsWith('Bearer ')) return false
  const url = env.url.trim().replace(/\/$/, '')
  const anon = env.anon.trim()
  if (!url || !anon) return false
  try {
    const res = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: authorization },
    })
    return res.ok
  } catch {
    return false
  }
}
