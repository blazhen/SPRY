import { gate } from "../lib/auth.js";
import { jsonError, jsonOk } from "../lib/http.js";
import { publicSecret, quoteKey, QUOTE_ID } from "../lib/public-link.js";

// GET /api/quote-link?id= -> { key }. Staff only (same lock as the other routes). The Hub builds #/view/<id>?k=<key> from it.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  if (!publicSecret()) return jsonError(503, "Not configured");
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!QUOTE_ID.test(id)) return jsonError(400, "Bad id");
  return jsonOk({ key: await quoteKey(id) });
}
