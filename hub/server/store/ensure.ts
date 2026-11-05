import { getFileStorage, setFileStorage } from "../lib/files.js";
import { createSupabaseFiles, type SupabaseAdminLike } from "./files-supabase.js";
import { getStore, setStore } from "./index.js";
import { createSupabaseRestStore } from "./supabase-rest.js";

// Just the storage calls the file adapter needs, over the Storage REST API (no client library on this host).
function createRestStorageAdmin(url: string, key: string): SupabaseAdminLike {
  const root = url.replace(/\/+$/, "") + "/storage/v1";
  const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");
  const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(root + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = res.ok ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : null;
    return { data, error: res.ok ? null : { status: res.status }, status: res.status };
  };
  const abs = (rel: unknown) => root + String(rel ?? "").replace(/^\/storage\/v1/, "");
  return {
    storage: {
      from: (bucket) => ({
        async createSignedUploadUrl(path) {
          const r = await call("POST", "/object/upload/sign/" + bucket + "/" + enc(path));
          const rel = (r.data as { url?: string } | null)?.url;
          return r.error || !rel ? { data: null, error: r.error ?? { status: 500 } } : { data: { signedUrl: abs(rel), token: "", path }, error: null };
        },
        async createSignedUrl(path, expiresIn, options) {
          const r = await call("POST", "/object/sign/" + bucket + "/" + enc(path), { expiresIn });
          const rel = (r.data as { signedURL?: string } | null)?.signedURL;
          if (r.error || !rel) return { data: null, error: r.error ?? { status: 500 } };
          const dl = options?.download;
          const extra = typeof dl === "string" && dl ? "&download=" + encodeURIComponent(dl) : "";
          return { data: { signedUrl: abs(rel) + extra }, error: null };
        },
        async remove(paths) {
          const r = await call("DELETE", "/object/" + bucket, { prefixes: paths });
          return { data: r.data, error: r.error };
        },
        async info(path) {
          const r = await call("GET", "/object/info/" + bucket + "/" + enc(path));
          return { data: r.data as { size?: number | null } | null, error: r.error };
        },
        async exists(path) {
          const r = await call("GET", "/object/info/" + bucket + "/" + enc(path));
          if (r.status === 404 || r.status === 400) return { data: false, error: null };
          return { data: !r.error, error: r.error };
        },
      }),
    },
  };
}

/**
 * Hosts without a built-in store (Vercel): register the database store from SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on
 * first use. Does nothing when a store exists already (SPRY_STORE=file in dev, or one set by the host). With the settings
 * missing no store is registered, so the routes that need it answer 503 "Storage not configured".
 */
export async function ensureStore(): Promise<void> {
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  // Job document files use the same settings (private bucket); skipped when a storage exists already (the dev fake).
  if (url && key && !(await getFileStorage())) setFileStorage(createSupabaseFiles(createRestStorageAdmin(url, key)));
  if (await getStore()) return;
  if (url && key) setStore(createSupabaseRestStore(url, key));
}
