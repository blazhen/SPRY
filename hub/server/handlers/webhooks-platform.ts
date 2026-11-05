import { setStatus, validLocationId } from "../lib/accounts.js";
import { getAppConfig } from "../lib/app-config.js";
import { jsonError, jsonOk } from "../lib/http.js";
import { clientIp, rateLimited } from "../lib/public-link.js";

// Served at /webhooks/platform (NOT under /api; dev server alias, TanStack file webhooks.platform.tsx).
// POST /webhooks/platform { type, appId, locationId, companyId, userId, installType }.
// INSTALL marks the account active (a record with no tokens is made if the callback has not run yet); UNINSTALL marks it
// uninstalled. Nothing is ever deleted: tokens and every other record stay. Other event types are acknowledged and ignored.
// What is verified: the body is JSON with well formed ids, appId is this app's, and (only when HUB_APP_WEBHOOK_PUBLIC_KEY and
// HUB_APP_WEBHOOK_SIG_HEADER are both set) an Ed25519 signature over the RAW body, base64, in that header (per the platform's
// docs; the older RSA header is retired and not read). The header name is a setting so it is not written in the repo.
// Not yet seen on a real delivery. Without the settings, appId is all that can be checked (it is not secret).
const MAX_BODY = 64 * 1024;

async function readRaw(request: Request): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return null;
  const body = request.body;
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return all;
}

function pemToDer(pem: string): Uint8Array {
  const bin = atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signatureOk(raw: Uint8Array, sigB64: string, pem: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("spki", pemToDer(pem) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(sigB64.trim()), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify({ name: "Ed25519" }, key, sig as BufferSource, raw as BufferSource);
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (rateLimited("webhook", clientIp(request))) return jsonError(429, "Too many requests");
  const cfg = getAppConfig();
  if (!cfg.appId) return jsonError(503, "Not configured");
  const raw = await readRaw(request);
  if (!raw) return jsonError(400, "Bad request");
  if (cfg.webhookPublicKey && cfg.webhookSigHeader) {
    const sig = request.headers.get(cfg.webhookSigHeader) ?? "";
    if (!sig || !(await signatureOk(raw, sig, cfg.webhookPublicKey))) return jsonError(401, "Unauthorized");
  }
  let b: Record<string, unknown>;
  try {
    const v: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!v || typeof v !== "object" || Array.isArray(v)) return jsonError(400, "Bad request");
    b = v as Record<string, unknown>;
  } catch {
    return jsonError(400, "Bad request");
  }
  if (b.appId !== cfg.appId) return jsonError(400, "Wrong app");
  const type = typeof b.type === "string" ? b.type.trim().toUpperCase() : "";
  if (type !== "INSTALL" && type !== "UNINSTALL") return jsonOk({ ok: true, ignored: true });
  const locationId = typeof b.locationId === "string" ? b.locationId : "";
  if (!validLocationId(locationId)) return jsonOk({ ok: true, ignored: true }); // a company level event has no account to mark
  const idOf = (v: unknown) => (typeof v === "string" && validLocationId(v) ? v : "");
  try {
    const known = await setStatus(
      locationId,
      type === "INSTALL" ? "active" : "uninstalled",
      { companyId: idOf(b.companyId), userId: idOf(b.userId) },
      Date.now(),
      type === "INSTALL",
    );
    return jsonOk(known ? { ok: true } : { ok: true, ignored: true });
  } catch {
    // 503 so the platform retries when storage is down.
    return jsonError(503, "Storage unavailable");
  }
}
