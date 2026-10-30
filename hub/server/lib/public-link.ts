import { sameOrigin } from './auth.js';
import { jsonError } from './http.js';

// Customer links. One key per quote: base64url(HMAC-SHA256(secret, "quote:" + quoteId)) cut to 32 characters.
// The secret (SPRY_PUBLIC_LINK_SECRET) is separate from the staff secret. Read inside functions, never at module scope.

export const QUOTE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const KEY_LEN = 32;

export function publicSecret(): string {
  return (process.env.SPRY_PUBLIC_LINK_SECRET ?? '').trim();
}

export async function quoteKey(id: string, secret: string = publicSecret()): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('quote:' + id)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, KEY_LEN);
}

/** Constant-time compare of the supplied key with the expected one. */
export async function keyMatches(id: string, supplied: string): Promise<boolean> {
  const secret = publicSecret();
  if (!secret) return false;
  const want = await quoteKey(id, secret);
  const a = new TextEncoder().encode(want);
  const b = new TextEncoder().encode(supplied.slice(0, 256));
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ (b[i] ?? 0);
  return diff === 0;
}

// ---- Rate limit: in memory, per quote id and IP, 30 requests a minute (fixed window). ----
const WINDOW_MS = 60_000;
const LIMIT = 30;
const hits = new Map<string, { start: number; count: number }>();

const MAX_TRACKED = 10_000;

/**
 * Client IP for the rate limit. Uses the RIGHTMOST X-Forwarded-For entry (the one the trusted proxy appended;
 * earlier entries are client-supplied and can be rotated to dodge the limit), then x-real-ip, then 'unknown'.
 * The map is in memory per server instance: on serverless a shared limiter (database or edge store) is needed.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  return (request.headers.get('x-real-ip') ?? '').trim().slice(0, 64) || 'unknown';
}

/** True when this request is over the limit. */
export function rateLimited(id: string, ip: string, now: number = Date.now()): boolean {
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= WINDOW_MS) hits.delete(k);
  const key = id + '|' + ip;
  const h = hits.get(key);
  if (!h || now - h.start >= WINDOW_MS) {
    hits.delete(key);
    while (hits.size >= MAX_TRACKED) {
      const oldest = hits.keys().next().value; // Map keeps insertion order: the first key is the oldest
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  h.count += 1;
  return h.count > LIMIT;
}

export function resetRateLimit(): void {
  hits.clear();
}

/** One body for every "no": unknown id, wrong key, draft, superseded. No hints. */
export const notFound = (): Response => jsonError(404, 'Not found');

/** Shared gate for the public routes. Returns an error Response, or the verified quote id. */
export async function publicGate(request: Request): Promise<Response | { id: string }> {
  if (!publicSecret()) return jsonError(503, 'Not configured');
  if (!sameOrigin(request)) return jsonError(403, 'Forbidden');
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const k = url.searchParams.get('k') ?? '';
  if (rateLimited(QUOTE_ID.test(id) ? id : '-', clientIp(request))) return jsonError(429, 'Too many requests');
  if (!QUOTE_ID.test(id) || !k || !(await keyMatches(id, k))) return notFound();
  return { id };
}
