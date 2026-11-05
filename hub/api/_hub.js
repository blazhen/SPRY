// Shared entry for the Vercel functions. Files starting with _ are not functions. Imports the COMPILED handlers
// (server/.build, made by `npm run server:build`, which vercel.json runs as part of the install step).
// A new file in server/handlers needs one import line and one entry in `modules` below; `node server/test-run.mjs vercel` fails if one is missing.
import { routeKey } from '../server/routes.mjs'
import { ensureStore } from '../server/.build/store/ensure.js'
import * as authUserContext from '../server/.build/handlers/auth-user-context.js'
import * as auth from '../server/.build/handlers/auth.js'
import * as contactFields from '../server/.build/handlers/contact-fields.js'
import * as contactWrite from '../server/.build/handlers/contact-write.js'
import * as contact from '../server/.build/handlers/contact.js'
import * as contacts from '../server/.build/handlers/contacts.js'
import * as conversations from '../server/.build/handlers/conversations.js'
import * as files from '../server/.build/handlers/files.js'
import * as invoicesPayment from '../server/.build/handlers/invoices-payment.js'
import * as invoicesSend from '../server/.build/handlers/invoices-send.js'
import * as invoicesVoid from '../server/.build/handlers/invoices-void.js'
import * as invoices from '../server/.build/handlers/invoices.js'
import * as job from '../server/.build/handlers/job.js'
import * as jobs from '../server/.build/handlers/jobs.js'
import * as notes from '../server/.build/handlers/notes.js'
import * as oauthCallback from '../server/.build/handlers/oauth-callback.js'
import * as opportunityFields from '../server/.build/handlers/opportunity-fields.js'
import * as participants from '../server/.build/handlers/participants.js'
import * as pipelines from '../server/.build/handlers/pipelines.js'
import * as publicQuoteRespond from '../server/.build/handlers/public-quote-respond.js'
import * as publicQuote from '../server/.build/handlers/public-quote.js'
import * as quoteLink from '../server/.build/handlers/quote-link.js'
import * as store from '../server/.build/handlers/store.js'
import * as tags from '../server/.build/handlers/tags.js'
import * as tasks from '../server/.build/handlers/tasks.js'
import * as users from '../server/.build/handlers/users.js'
import * as webhooksPlatform from '../server/.build/handlers/webhooks-platform.js'

export const modules = {
  'auth-user-context': authUserContext, auth, 'contact-fields': contactFields, 'contact-write': contactWrite, contact, contacts,
  conversations, files, 'invoices-payment': invoicesPayment, 'invoices-send': invoicesSend, 'invoices-void': invoicesVoid, invoices,
  job, jobs, notes, 'oauth-callback': oauthCallback, 'opportunity-fields': opportunityFields, participants, pipelines,
  'public-quote-respond': publicQuoteRespond, 'public-quote': publicQuote, 'quote-link': quoteLink, store, tags, tasks, users,
  'webhooks-platform': webhooksPlatform,
}

// Same merge as the dev server: files that share a path (contact and contact-write) add their methods together.
export const handlers = {}
for (const [name, mod] of Object.entries(modules)) {
  const key = routeKey(name)
  handlers[key] = { ...(handlers[key] ?? {}), ...mod }
}

const json = (status, error) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Run the handler stored under a route key for this request's method. */
export async function run(key, request) {
  const fn = handlers[key]?.[request.method]
  if (typeof fn !== 'function') return json(404, 'Not found')
  try {
    await ensureStore()
    return await fn(request)
  } catch {
    return json(500, 'Server error') // handlers answer their own errors; this is the last net, never any detail
  }
}

/** /api/<name> by the request path. Root routes are not reachable through /api. */
export function dispatch(request) {
  const { pathname } = new URL(request.url)
  const key = pathname.startsWith('/api/') ? pathname.slice(5).replace(/\/+$/, '') : ''
  if (!key || key.startsWith('/')) return json(404, 'Not found')
  return run(key, request)
}
