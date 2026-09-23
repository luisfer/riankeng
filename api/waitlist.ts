import { handleWaitlist } from '../src/waitlist-join.js'

/** Store one waitlist address. Nothing is emailed. */
export function POST(request: Request): Promise<Response> {
  return handleWaitlist(request, {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
