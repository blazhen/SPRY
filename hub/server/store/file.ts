// JSON-file adapter. For local testing only (one process, one machine). Production uses the Supabase adapter.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ConflictError, isStale, type HubStore, type Rec } from './types.js';

type Db = Record<string, Record<string, Rec>>;

export function createFileStore(file?: string): HubStore {
  const target = path.resolve(file || process.env.SPRY_STORE_FILE || path.join('hub', 'server', '.data', 'store.json'));
  let queue: Promise<unknown> = Promise.resolve();

  // In-process mutex: every operation runs after the previous one finishes.
  function locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  }

  async function load(): Promise<Db> {
    try {
      return JSON.parse(await readFile(target, 'utf8')) as Db;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw e;
    }
  }

  async function save(db: Db): Promise<void> {
    await mkdir(path.dirname(target), { recursive: true });
    const tmp = target + '.' + process.pid + '.tmp';
    await writeFile(tmp, JSON.stringify(db), 'utf8');
    await rename(tmp, target);
  }

  return {
    list: (collection) => locked(async () => Object.values((await load())[collection] ?? {})),
    get: (collection, id) => locked(async () => (await load())[collection]?.[id] ?? null),
    put: (collection, id, data, ifUpdatedAt) =>
      locked(async () => {
        const db = await load();
        const col = (db[collection] ??= {});
        const old = col[id];
        if (ifUpdatedAt && old && isStale(old.updatedAt, ifUpdatedAt)) throw new ConflictError();
        let ts = new Date().toISOString();
        if (old && ts <= old.updatedAt) ts = new Date(Date.parse(old.updatedAt) + 1).toISOString();
        const rec: Rec = { id, data, updatedAt: ts };
        col[id] = rec;
        await save(db);
        return rec;
      }),
    delete: (collection, id) =>
      locked(async () => {
        const db = await load();
        if (db[collection]?.[id]) {
          delete db[collection][id];
          await save(db);
        }
      }),
  };
}
