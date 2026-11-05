// Vercel function for POST /auth/user-context (vercel.json rewrites the root path here). The key is fixed, not read from the path.
import { run } from '../_hub.js'

export const POST = (request) => run('/auth/user-context', request)
