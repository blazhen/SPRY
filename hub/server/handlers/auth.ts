import { gate } from "../lib/auth.js";
import { jsonOk } from "../lib/http.js";

// GET /api/auth : lets the Hub check that its token is accepted.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return jsonOk({ ok: true });
}
