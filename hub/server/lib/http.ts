export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function jsonError(status: number, message: string): Response {
  return jsonOk({ error: message }, status);
}

/** Parse a JSON object body. Returns null when the body is missing, invalid or not an object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(request: Request): Promise<Record<string, any> | null> {
  try {
    const v: unknown = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BodyResult =
  { ok: true; value: Record<string, any> } | { ok: false; status: number; error: string };

/**
 * Read a JSON object body with a hard byte cap, counted while streaming so it works without Content-Length
 * (chunked bodies too). Oversize and unreadable bodies both answer status 400 (error 'Body too large' or 'Bad request').
 */
export async function readJsonCapped(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, status: 400, error: "Body too large" };
  const body = request.body;
  if (!body) return { ok: false, status: 400, error: "Bad request" };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 400, error: "Body too large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Bad request" };
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  try {
    const v: unknown = JSON.parse(new TextDecoder().decode(all));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return v && typeof v === "object" && !Array.isArray(v)
      ? { ok: true, value: v as Record<string, any> }
      : { ok: false, status: 400, error: "Bad request" };
  } catch {
    return { ok: false, status: 400, error: "Bad request" };
  }
}

export function intParam(url: URL, name: string, def: number, min = 1, max = 1000): number {
  const n = parseInt(url.searchParams.get(name) ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}
