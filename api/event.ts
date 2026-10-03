import { handleEvent } from '../src/event-log.js'

/** Count one thing a visitor did on the demo card or the preview. Never an address. */
export function POST(request: Request): Promise<Response> {
  return handleEvent(request, {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
