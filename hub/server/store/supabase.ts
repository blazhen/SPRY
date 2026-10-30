// Supabase adapter. The client is injected (the TanStack wrapper imports supabaseAdmin from
// "@/integrations/supabase/client.server" and passes it in), so this file never imports a path that
// only exists in the deploy repo. The admin client bypasses RLS: server only, never in browser code.
import { ConflictError, type HubStore, type Rec } from './types.js';

type Row = { id: string; data: unknown; updated_at: string };
type DbError = { message: string; code?: string };
type Result<T> = PromiseLike<{ data: T | null; error: DbError | null }>;

/** The few client calls used here, typed loosely so any generated Supabase client fits. */
export interface MinimalSupabase {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        order(col: string, opts?: { ascending: boolean }): Result<Row[]>;
        eq(col: string, val: string): { maybeSingle(): Result<Row> };
      };
    };
    upsert(row: Record<string, unknown>, opts?: { onConflict: string }): {
      select(cols: string): { single(): Result<Row> };
    };
    insert(row: Record<string, unknown>): {
      select(cols: string): { single(): Result<Row> };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): {
        eq(col: string, val: string): {
          eq(col: string, val: string): { select(cols: string): { maybeSingle(): Result<Row> } };
        };
      };
    };
    delete(): { eq(col: string, val: string): { eq(col: string, val: string): Result<unknown> } };
  };
}

const TABLE = 'hub_records';
const COLS = 'id, data, updated_at';
const toRec = (r: Row): Rec => ({ id: r.id, data: r.data, updatedAt: new Date(r.updated_at).toISOString() });

export function createSupabaseStore(client: MinimalSupabase): HubStore {
  // Never pass the database message upward: it can name tables and columns.
  const fail = (_e: DbError | null): never => {
    throw new Error('Store error');
  };
  const get = async (collection: string, id: string): Promise<Rec | null> => {
    const { data, error } = await client.from(TABLE).select(COLS).eq('collection', collection).eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toRec(data) : null;
  };
  return {
    async list(collection) {
      const { data, error } = await client.from(TABLE).select(COLS).eq('collection', collection).order('updated_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []).map(toRec);
    },
    get,
    async put(collection, id, data, ifUpdatedAt) {
      const stamp = new Date().toISOString();
      if (!ifUpdatedAt) {
        // No guard asked for: last write wins.
        const { data: row, error } = await client.from(TABLE).upsert({ collection, id, data, updated_at: stamp }, { onConflict: 'collection,id' }).select(COLS).single();
        if (error || !row) return fail(error);
        return toRec(row);
      }
      // Guarded write, atomic in the database: the update only matches while updated_at still equals what the client saw.
      // Zero rows matched means the record changed (conflict) or does not exist yet (insert; a unique violation means someone
      // inserted first, also a conflict). Needs timestamps written by this adapter (millisecond ISO strings).
      const upd = await client.from(TABLE).update({ data, updated_at: stamp }).eq('collection', collection).eq('id', id).eq('updated_at', ifUpdatedAt).select(COLS).maybeSingle();
      if (upd.error) return fail(upd.error);
      if (upd.data) return toRec(upd.data);
      if (await get(collection, id)) throw new ConflictError();
      const ins = await client.from(TABLE).insert({ collection, id, data, updated_at: stamp }).select(COLS).single();
      if (ins.error?.code === '23505') throw new ConflictError();
      if (ins.error || !ins.data) return fail(ins.error);
      return toRec(ins.data);
    },
    async delete(collection, id) {
      const { error } = await client.from(TABLE).delete().eq('collection', collection).eq('id', id);
      if (error) fail(error);
    },
  };
}
