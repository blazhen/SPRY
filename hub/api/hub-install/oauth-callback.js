// Vercel function for GET /oauth/callback (vercel.json rewrites the root path here). The key is fixed, not read from the path.
import { run } from '../_hub.js'

export const GET = (request) => run('/oauth/callback', request)
