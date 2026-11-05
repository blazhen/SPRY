// In-memory FileStorage for the dev server and tests. It also answers real HTTP for the signed links it hands out:
// PUT /fake-storage/up/<token> stores the body, GET /fake-storage/dl/<token> returns it. Tokens are random, short
// lived and scoped to one path. Not for production.
import { MAX_BYTES, type FileStorage } from "../lib/files.js";

type Token = { path: string; exp: number; name?: string };

export interface FakeFileStorage extends FileStorage {
  /** Handle a request under /fake-storage/. Returns null when the path is not ours. */
  handle(method: string, pathname: string, body: Uint8Array | undefined): Promise<Response | null>;
  /** Test helper: the stored bytes, or undefined. */
  bytes(path: string): Uint8Array | undefined;
}

function token(): string {
  const b = new Uint8Array(24);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function createFakeFileStorage(baseUrl: string): FakeFileStorage {
  const objects = new Map<string, Uint8Array>();
  const ups = new Map<string, Token>();
  const dls = new Map<string, Token>();
  const root = baseUrl.replace(/\/+$/, "");
  const live = (m: Map<string, Token>, t: string): Token | null => {
    const v = m.get(t);
    if (!v) return null;
    if (v.exp < Date.now()) {
      m.delete(t);
      return null;
    }
    return v;
  };
  return {
    async createSignedUploadUrl(path, expiresIn) {
      const t = token();
      ups.set(t, { path, exp: Date.now() + expiresIn * 1000 });
      return { url: root + "/fake-storage/up/" + t, headers: {} };
    },
    async createSignedDownloadUrl(path, expiresIn, downloadName) {
      const t = token();
      dls.set(t, { path, exp: Date.now() + expiresIn * 1000, name: downloadName });
      return root + "/fake-storage/dl/" + t;
    },
    async remove(path) {
      objects.delete(path);
    },
    async head(path) {
      const o = objects.get(path);
      return o ? { size: o.byteLength } : null;
    },
    bytes: (path) => objects.get(path),
    async handle(method, pathname, body) {
      const m = /^\/fake-storage\/(up|dl)\/([a-f0-9]{48})$/.exec(pathname);
      if (!pathname.startsWith("/fake-storage/")) return null;
      const deny = new Response('{"error":"Not found"}', { status: 404, headers: { "Content-Type": "application/json" } });
      if (!m) return deny;
      if (m[1] === "up" && method === "PUT") {
        const t = live(ups, m[2]);
        if (!t) return deny;
        const data = body ?? new Uint8Array(0);
        if (data.byteLength > MAX_BYTES)
          return new Response('{"error":"File too big (25 MB limit)"}', { status: 413, headers: { "Content-Type": "application/json" } });
        objects.set(t.path, new Uint8Array(data));
        return new Response(null, { status: 200 });
      }
      if (m[1] === "dl" && method === "GET") {
        const t = live(dls, m[2]);
        const o = t ? objects.get(t.path) : undefined;
        if (!t || !o) return deny;
        const headers: Record<string, string> = { "Content-Type": "application/octet-stream" };
        if (t.name !== undefined)
          headers["Content-Disposition"] = 'attachment; filename="' + t.name.replace(/[^A-Za-z0-9._ -]/g, "_") + '"';
        return new Response(new Uint8Array(o), { status: 200, headers });
      }
      return deny;
    },
  };
}
