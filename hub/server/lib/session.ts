// A signed Hub session for one account and user. Same shape and secret as the signed menu link token
// ("header.payload.signature", HMAC-SHA256, payload has loc and exp), plus uid. The existing routes check loc against the
// fixed account, so a session for another location is not accepted by them (they are not rewired yet).
import { getConfig } from "./env.js";

export const SESSION_HOURS = 4;

const b64url = (o: unknown): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** Returns null when SPRY_IFRAME_SECRET is not set. */
export async function signSession(
  loc: string,
  uid: string,
  now: number = Date.now(),
): Promise<{ token: string; exp: number } | null> {
  const secret = getConfig().iframeSecret;
  if (!secret) return null;
  const exp = Math.floor(now / 1000) + SESSION_HOURS * 3600;
  const head = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url(uid ? { loc, uid, exp } : { loc, exp });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(head + "." + payload)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  const s = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token: head + "." + payload + "." + s, exp };
}
