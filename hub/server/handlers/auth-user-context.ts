import { AccountError, getAccount, validLocationId } from "../lib/accounts.js";
import { getAppConfig } from "../lib/app-config.js";
import { sameOrigin } from "../lib/auth.js";
import { decryptCryptoJs } from "../lib/cryptojs.js";
import { jsonError, jsonOk, readJsonCapped } from "../lib/http.js";
import { clientIp, rateLimited } from "../lib/public-link.js";
import { signSession } from "../lib/session.js";

// Served at /auth/user-context (NOT under /api; dev server alias, TanStack file auth.user-context.tsx).
// POST /auth/user-context { payload } -> { token, exp, locationId, userId }.
// The page inside the platform gets the signed-in user's data as a CryptoJS AES string (secret = HUB_APP_SHARED_SECRET).
// It is decrypted here, the account is read from it, and a Hub session is signed for that location and user (the same
// token shape as the menu link, SPRY_IFRAME_SECRET, 4 hours). The account must be installed and active.
// Documented fields of the decrypted data: userId, companyId, role, type (agency or location), activeLocation (location type
// only), userName, email, isAgencyOwner, region, versionId, appStatus, whitelabelDetails. Any may be missing and extra ones
// are ignored. Only the NAMES are logged, never values. Still to verify on a real install: the real shape of activeLocation
// (a string, or an object with an id, are both read).
// type "agency" means no account is chosen yet: the session is refused unless activeLocation is present.
const LOCATION_KEYS = ["activeLocation", "locationId", "location_id"] as const;
const USER_KEYS = ["userId", "user_id", "id"] as const;
const BODY_KEYS = ["payload", "data", "encryptedData", "userData"] as const;

function pickId(o: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    let v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      v = inner.id ?? inner.locationId ?? inner._id;
    }
    if (typeof v === "string" && validLocationId(v)) return v;
  }
  return "";
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return jsonError(403, "Forbidden");
  if (rateLimited("user-context", clientIp(request))) return jsonError(429, "Too many requests");
  const cfg = getAppConfig();
  if (!cfg.sharedSecret) return jsonError(503, "Not configured");
  const read = await readJsonCapped(request, 32 * 1024);
  if (!read.ok) return jsonError(read.status, read.error);
  const enc = BODY_KEYS.map((k) => read.value[k]).find((v) => typeof v === "string") as string | undefined;
  if (!enc) return jsonError(400, "Bad request");
  const text = await decryptCryptoJs(enc, cfg.sharedSecret);
  let data: Record<string, unknown>;
  try {
    const v: unknown = text === null ? null : JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) return jsonError(400, "Could not read the user data");
    data = v as Record<string, unknown>;
  } catch {
    return jsonError(400, "Could not read the user data");
  }
  // Field NAMES only (letters, digits, underscore, capped), so the logs show the real shape without any value.
  const names = Object.keys(data)
    .map((k) => k.replace(/[^A-Za-z0-9_]/g, "").slice(0, 40))
    .filter(Boolean)
    .slice(0, 40);
  console.info("[user-context] fields: " + names.join(","));
  // An agency level user has not chosen an account: only a present activeLocation counts, not the other keys.
  const isAgency = typeof data.type === "string" && data.type.trim().toLowerCase() === "agency";
  const locationId = pickId(data, isAgency ? ["activeLocation"] : LOCATION_KEYS);
  if (!locationId) return jsonError(isAgency ? 403 : 400, isAgency ? "Choose an account first" : "No account in the user data");
  const userId = pickId(data, USER_KEYS);
  let account;
  try {
    account = await getAccount(locationId);
  } catch (e) {
    return jsonError(e instanceof AccountError ? 503 : 500, "Storage unavailable");
  }
  if (!account || account.status !== "active") return jsonError(403, "Not installed on this account");
  const session = await signSession(locationId, userId);
  if (!session) return jsonError(503, "Not configured");
  return jsonOk({ token: session.token, exp: session.exp, locationId, userId });
}
