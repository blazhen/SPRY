import { jsonError, jsonOk } from "../lib/http.js";
import { publicGate, notFound } from "../lib/public-link.js";
import { isViewable, loadContext, toView } from "../lib/public-quote.js";
import { customerPhotos } from "../lib/photos-public.js";
import { getStore, type HubStore } from "../store/index.js";

// Counts one open of the customer page: how many times and when, nothing about the visitor (no address, device or name).
// Opens less than a minute apart count once. Never blocks or breaks the page: any error is ignored.
const OPEN_GAP_MS = 60_000;
export async function recordOpen(store: HubStore, quoteId: string, now: Date = new Date()): Promise<void> {
  try {
    const cur = (await store.get("quoteOpens", quoteId))?.data as { count?: number; first?: string; last?: string } | undefined;
    const at = now.toISOString();
    if (cur && typeof cur.last === "string" && now.getTime() - Date.parse(cur.last) < OPEN_GAP_MS) return;
    const count = (typeof cur?.count === "number" && cur.count > 0 ? cur.count : 0) + 1;
    await store.put("quoteOpens", quoteId, { count, first: typeof cur?.first === "string" ? cur.first : at, last: at });
  } catch {
    /* the customer still sees the quote */
  }
}

// GET /api/public/quote?id=&k= -> { quote, businessName, recipientName, jobName, jobAddress }. No staff token: the key is the access.
// Only that one quote, whitelisted fields (see lib/public-quote.ts toView). Unknown id, wrong key, draft, superseded: the same 404.
export async function GET(request: Request): Promise<Response> {
  const g = await publicGate(request);
  if (g instanceof Response) return g;
  try {
    const store = await getStore();
    if (!store) return jsonError(503, "Not configured");
    const rec = await store.get("quotes", g.id);
    const q = rec?.data as Record<string, unknown> | undefined;
    if (!q || typeof q !== "object" || !isViewable(q)) return notFound();
    await recordOpen(store, g.id);
    const view = toView(q, await loadContext(q, store));
    // Inspection photos staff marked "On the quote" (signed pictures only, see lib/photos-public.ts).
    return jsonOk({ ...view, photos: await customerPhotos(store, String(q.jobId ?? "")) });
  } catch {
    return jsonError(503, "Unavailable");
  }
}
