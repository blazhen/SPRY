import { getConfig } from './env.js';
import { jsonError } from './http.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/** Same-origin check. Absent Origin is rejected on state-changing methods, allowed on GET/HEAD. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return !STATE_CHANGING.has(request.method.toUpperCase());
  const url = new URL(request.url);
  const host = request.headers.get('host');
  const allowed = new Set<string>([url.origin, ...getConfig().allowedOrigins]);
  if (host) {
    allowed.add('http://' + host);
    allowed.add('https://' + host);
  }
  return allowed.has(origin);
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Token is "header.payload.signature", HMAC-SHA256 over "header.payload", base64url. Payload has loc and exp (seconds). */
export async function verifyToken(token: string, secret: string, expectedLoc: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !secret || !expectedLoc) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1]))) as { loc?: unknown; exp?: unknown };
    if (payload.loc !== expectedLoc) return false;
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Staff token: header X-Quote-Token only (a ?t= query is NOT accepted, URLs end up in logs). Returns null when allowed, or the error Response to send. */
export async function authorize(request: Request): Promise<Response | null> {
  const c = getConfig();
  if (!c.iframeSecret) {
    if (c.allowOpen) return null;
    return jsonError(503, 'Access not configured');
  }
  const token = request.headers.get('x-quote-token') ?? '';
  if (!token || !(await verifyToken(token, c.iframeSecret, c.locationId))) return jsonError(401, 'Unauthorized');
  return null;
}

/** Run the standard gate: sameOrigin then authorize. Returns an error Response or null. */
export async function gate(request: Request): Promise<Response | null> {
  if (!sameOrigin(request)) return jsonError(403, 'Forbidden');
  return authorize(request);
}
