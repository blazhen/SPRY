import { ConfigError, crmFetch, getConfig } from './env.js';
import { jsonError } from './http.js';

// Our own shapes. Raw CRM objects never leave the server.
export interface Contact { id: string; name: string; email: string; phone: string; suburb: string; companyName?: string }
export interface JobField { id: string; name: string; value: string | number | null }
export interface Job {
  id: string; contactId: string; title: string; address: string; stage: string; status: string;
  monetaryValue: number; pipelineName: string; customFields: JobField[];
  ownerId: string; source: string; createdAt: string; stageSince: string; companyName?: string;
}
export interface Pipeline { id: string; name: string; stages: { id: string; name: string }[] }
export interface OppField { id: string; key: string; name: string; dataType: string; options: string[] }

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export class CrmError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function crmJson(path: string, init?: RequestInit): Promise<Obj> {
  const r = await crmFetch(path, init);
  const j = (await r.json().catch(() => ({}))) as Obj;
  if (!r.ok) {
    const m = Array.isArray(j.message) ? j.message.join('; ') : String(j.message ?? j.error ?? 'CRM error');
    throw new CrmError(r.status, m.slice(0, 200));
  }
  return j;
}

/** Wrap a handler body so config and CRM failures become clean JSON errors (no secrets, no raw bodies). */
export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConfigError) return jsonError(503, 'Access not configured');
    if (e instanceof CrmError) return jsonError(e.status === 404 ? 404 : 502, e.status === 404 ? 'Not found' : 'CRM request failed (' + e.status + ')');
    return jsonError(500, 'Server error');
  }
}

const TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v as T;
  const v = await load();
  cache.set(key, { at: Date.now(), v });
  return v;
}

export function getPipelines(): Promise<Pipeline[]> {
  const L = getConfig().locationId;
  return cached('pipelines:' + L, async () => {
    const j = await crmJson('/opportunities/pipelines?locationId=' + L);
    return ((j.pipelines ?? []) as Obj[]).map((p) => ({
      id: String(p.id), name: String(p.name ?? ''),
      stages: ((p.stages ?? []) as Obj[]).map((s) => ({ id: String(s.id), name: String(s.name ?? '') })),
    }));
  });
}

export function getOppFields(): Promise<OppField[]> {
  const L = getConfig().locationId;
  return cached('oppfields:' + L, async () => {
    const j = await crmJson('/locations/' + L + '/customFields?model=opportunity');
    return ((j.customFields ?? []) as Obj[]).map((f) => ({
      id: String(f.id), key: String(f.fieldKey ?? ''), name: String(f.name ?? ''), dataType: String(f.dataType ?? ''),
      options: Array.isArray(f.picklistOptions) ? f.picklistOptions.map(String) : [],
    }));
  });
}

export function mapContact(c: Obj): Contact {
  const first = String(c.firstName ?? '');
  const last = String(c.lastName ?? '');
  const out: Contact = {
    id: String(c.id ?? c._id ?? ''),
    name: String(c.contactName ?? (`${first} ${last}`.trim() || c.name || '')),
    email: String(c.email ?? ''),
    phone: String(c.phone ?? ''),
    suburb: String(c.city ?? ''),
  };
  if (c.companyName) out.companyName = String(c.companyName);
  return out;
}

export async function mapJob(o: Obj, pipelines?: Pipeline[], fields?: OppField[]): Promise<Job> {
  const pl = pipelines ?? (await getPipelines());
  const fl = fields ?? (await getOppFields());
  const pipe = pl.find((p) => p.id === o.pipelineId);
  const stage = pipe?.stages.find((s) => s.id === o.pipelineStageId);
  const ct: Obj = o.contact ?? {};
  const address = [ct.address1, ct.city].filter(Boolean).join(', ');
  const customFields: JobField[] = ((o.customFields ?? []) as Obj[]).map((f) => ({
    id: String(f.id),
    name: fl.find((d) => d.id === f.id)?.name ?? '',
    value: (f.fieldValueString ?? f.fieldValueNumber ?? f.fieldValueDate ?? f.fieldValue ?? null) as string | number | null,
  }));
  // lastStageChangeAt and createdAt are proven in Dev (TEST-REPORT). The other variants and source/assignedTo are tolerant reads: UNTESTED.
  const iso = (...v: unknown[]): string => {
    const hit = v.find((x) => typeof x === 'string' && x !== '' && !Number.isNaN(Date.parse(x))) as string | undefined;
    return hit ? new Date(hit).toISOString() : '';
  };
  const createdAt = iso(o.createdAt, o.dateAdded);
  const out: Job = {
    id: String(o.id ?? o._id ?? ''),
    contactId: String(o.contactId ?? ct.id ?? ''),
    title: String(o.name ?? ''),
    address,
    stage: stage?.name ?? '',
    status: String(o.status ?? ''),
    monetaryValue: Number(o.monetaryValue ?? 0),
    pipelineName: pipe?.name ?? '',
    customFields,
    ownerId: String(o.assignedTo ?? ''),
    source: String(o.source ?? ''),
    createdAt,
    stageSince: iso(o.lastStageChangeAt, o.lastStatusChangeAt, o.dateUpdated) || createdAt,
  };
  if (ct.companyName) out.companyName = String(ct.companyName);
  return out;
}
