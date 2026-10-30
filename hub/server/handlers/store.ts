import { gate } from '../lib/auth.js';
import { jsonError, jsonOk, readJsonCapped } from '../lib/http.js';
import { ConflictError, getStore, type HubStore } from '../store/index.js';

const COLLECTIONS = new Set(['quotes', 'invoices', 'terms', 'templates', 'priceItems', 'settings', 'followups', 'events', 'messages', 'jobmeta', 'companies']);
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 1024 * 1024;

type Ctx = { store: HubStore; collection: string; id: string };

// Shared gate: same origin, signed token, storage present, collection allowed, id well formed.
async function prepare(request: Request): Promise<Response | Ctx> {
  const denied = await gate(request);
  if (denied) return denied;
  const store = await getStore();
  if (!store) return jsonError(503, 'Storage not configured');
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection') ?? '';
  if (!COLLECTIONS.has(collection)) return jsonError(400, 'Bad collection');
  const id = url.searchParams.get('id') ?? '';
  if (id && !ID.test(id)) return jsonError(400, 'Bad id');
  return { store, collection, id };
}

async function safe(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConflictError) return jsonError(409, 'Changed by someone else, reload and try again');
    return jsonError(503, 'Storage unavailable');
  }
}

// GET /api/store?collection= : all records. GET /api/store?collection=&id= : one record or 404.
export async function GET(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  return safe(async () => {
    if (!p.id) return jsonOk({ records: await p.store.list(p.collection) });
    const record = await p.store.get(p.collection, p.id);
    return record ? jsonOk({ record }) : jsonError(404, 'Not found');
  });
}

// PUT /api/store?collection=&id= {data, ifUpdatedAt?} : 409 if the stored record is newer than ifUpdatedAt.
// Collection quotes: ifUpdatedAt is REQUIRED for an existing record, and an Accepted or Declined status cannot be changed.
export async function PUT(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  if (!p.id) return jsonError(400, 'Bad id');
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return jsonError(400, 'JSON only');
  const read = await readJsonCapped(request, MAX_BODY);
  if (!read.ok) return jsonError(read.status, read.error);
  const b = read.value as { data?: unknown; ifUpdatedAt?: unknown };
  if (b.data === undefined || b.data === null) return jsonError(400, 'data is required');
  if (b.ifUpdatedAt !== undefined && (typeof b.ifUpdatedAt !== 'string' || Number.isNaN(Date.parse(b.ifUpdatedAt)))) return jsonError(400, 'Bad ifUpdatedAt');
  if (p.collection === 'quotes') {
    // Quotes are answered by customers, so staff writes are guarded: an existing quote needs ifUpdatedAt, and a stored
    // Accepted or Declined status cannot be changed (the customer's answer wins). Other collections stay last-write-wins unless ifUpdatedAt is sent.
    const store = p.store;
    return safe(async () => {
      const old = await store.get('quotes', p.id);
      if (old) {
        if (b.ifUpdatedAt === undefined) return jsonError(409, 'Reload and try again');
        const was = (old.data as { status?: unknown } | null)?.status;
        const now = (b.data as { status?: unknown } | null)?.status;
        if ((was === 'Accepted' || was === 'Declined') && now !== was) return jsonError(409, 'This quote was already answered');
      }
      return jsonOk({ record: await store.put('quotes', p.id, b.data, b.ifUpdatedAt as string | undefined) });
    });
  }
  return safe(async () => jsonOk({ record: await p.store.put(p.collection, p.id, b.data, b.ifUpdatedAt as string | undefined) }));
}

// DELETE /api/store?collection=&id=
export async function DELETE(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  if (!p.id) return jsonError(400, 'Bad id');
  return safe(async () => {
    await p.store.delete(p.collection, p.id);
    return jsonOk({ ok: true });
  });
}
