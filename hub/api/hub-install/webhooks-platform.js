// Vercel function for POST /webhooks/platform (vercel.json rewrites the root path here). The key is fixed, not read from the path.
import { run } from '../_hub.js'

export const POST = (request) => run('/webhooks/platform', request)
