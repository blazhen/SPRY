// Supabase adapter over plain HTTP (PostgREST), for hosts without the Lovable/AI Studio client (Vercel). Same table and same
// rules as supabase.ts: hub_records(collection, id, data, updated_at), guarded writes compare updated_at for equality.
// No dependency: only fetch. The service role key bypasses RLS: server only, never in browser code, never logged.
import { ConflictError, type HubStore, type Rec } from "./types.js";

type Row = { id: string; data: unknown; updated_at: string };

const COLS = "id,data,updated_at";
const toRec = (r: Row): Rec => ({ id: r.id, data: r.data, updatedAt: new Date(r.updated_at).toISOString() });
const enc = encodeURIComponent;

export function createSupabaseRestStore(baseUrl: string, serviceKey: string): HubStore {
  const base = baseUrl.replace(/\/+$/, "") + "/rest/v1/hub_records";
  // Never pass the database message upward: it can name tables and columns.
  const fail = (): never => {
    throw new Error("Store error");
  };
  const call = async (method: string, query: string, body?: unknown, prefer?: string): Promise<Response> => {
    try {
      return await fetch(base + query, {
        method,
        headers: {
          apikey: serviceKey,
          Authorization: "Bearer " + serviceKey,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(prefer ? { Prefer: prefer } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return fail();
    }
  };
  const rows = async (res: Response): Promise<Row[]> => {
    if (!res.ok) return fail();
    try {
      const j = (await res.json()) as unknown;
      return Array.isArray(j) ? (j as Row[]) : fail();
    } catch {
      return fail();
    }
  };
  const get = async (collection: string, id: string): Promise<Rec | null> => {
    const r = await rows(await call("GET", `?select=${COLS}&collection=eq.${enc(collection)}&id=eq.${enc(id)}&limit=1`));
    return r[0] ? toRec(r[0]) : null;
  };
  return {
    async list(collection) {
      const r = await rows(await call("GET", `?select=${COLS}&collection=eq.${enc(collection)}&order=updated_at.desc`));
      return r.map(toRec);
    },
    get,
    async put(collection, id, data, ifUpdatedAt) {
      const stamp = new Date().toISOString();
      if (!ifUpdatedAt) {
        // No guard asked for: last write wins.
        const r = await rows(
          await call("POST", `?on_conflict=collection,id&select=${COLS}`, { collection, id, data, updated_at: stamp }, "resolution=merge-duplicates,return=representation"),
        );
        return r[0] ? toRec(r[0]) : fail();
      }
      // Guarded write: the update only matches while updated_at still equals what the client saw (atomic in the database).
      // Zero rows matched means the record changed (conflict) or does not exist yet (insert; a unique violation is a conflict).
      const upd = await rows(
        await call("PATCH", `?collection=eq.${enc(collection)}&id=eq.${enc(id)}&updated_at=eq.${enc(ifUpdatedAt)}&select=${COLS}`, { data, updated_at: stamp }, "return=representation"),
      );
      if (upd[0]) return toRec(upd[0]);
      if (await get(collection, id)) throw new ConflictError();
      const ins = await call("POST", `?select=${COLS}`, { collection, id, data, updated_at: stamp }, "return=representation");
      if (ins.status === 409) throw new ConflictError();
      const r = await rows(ins);
      return r[0] ? toRec(r[0]) : fail();
    },
    async delete(collection, id) {
      const res = await call("DELETE", `?collection=eq.${enc(collection)}&id=eq.${enc(id)}`);
      if (!res.ok) fail();
    },
  };
}
