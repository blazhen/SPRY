import { jsonError, jsonOk } from '../lib/http.js';
import { publicGate, notFound } from '../lib/public-link.js';
import { isViewable, loadContext, toView } from '../lib/public-quote.js';
import { getStore } from '../store/index.js';

// GET /api/public/quote?id=&k= -> { quote, businessName, recipientName, jobName, jobAddress }. No staff token: the key is the access.
// Only that one quote, whitelisted fields (see lib/public-quote.ts toView). Unknown id, wrong key, draft, superseded: the same 404.
export async function GET(request: Request): Promise<Response> {
  const g = await publicGate(request);
  if (g instanceof Response) return g;
  try {
    const store = await getStore();
    if (!store) return jsonError(503, 'Not configured');
    const rec = await store.get('quotes', g.id);
    const q = rec?.data as Record<string, unknown> | undefined;
    if (!q || typeof q !== 'object' || !isViewable(q)) return notFound();
    return jsonOk(toView(q, await loadContext(q, store)));
  } catch {
    return jsonError(503, 'Unavailable');
  }
}
