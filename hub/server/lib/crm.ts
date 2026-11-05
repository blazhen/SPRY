import { ConfigError, crmFetch, getConfig } from "./env.js";
import { jsonError } from "./http.js";

// Our own shapes. Raw CRM objects never leave the server.
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  suburb: string;
  companyName?: string;
  customFields?: { id: string; name: string; value: string | number | null }[];
  /** Hub contact fields kept in the CRM (see lib/contact-extra.ts). Present only when the CRM sent custom fields. */
  mobile?: string;
  homeAddress?: string;
  privateNote?: string;
}
export interface JobField {
  id: string;
  name: string;
  value: string | number | null;
}
export interface Job {
  id: string;
  contactId: string;
  /** The contact's name as the CRM sends it on the job (empty when it does not). Lets the list show a name before the contact is fetched. */
  contactName: string;
  title: string;
  /** The JOB SITE address: the opportunity custom field site_address. Empty when not set. Never the contact's address. */
  address: string;
  /** The same value as address, named for what it is. */
  siteAddress: string;
  /** Access notes for the job: the opportunity custom field access_notes. */
  accessNotes: string;
  stage: string;
  status: string;
  monetaryValue: number;
  pipelineName: string;
  customFields: JobField[];
  ownerId: string;
  source: string;
  createdAt: string;
  stageSince: string;
  companyName?: string;
}
export interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}
export interface OppField {
  id: string;
  key: string;
  name: string;
  dataType: string;
  options: string[];
  category?: string;
  fieldGroup?: string;
  fieldKey?: string;
}

/** Group a custom field into a category (folder). Uses the CRM folder name when present. */
export function inferCategory(name: string, key: string, group?: string): string {
  if (group && group.trim()) return group.trim();
  const lower = `${name} ${key}`.toLowerCase();
  if (
    lower.includes("site") ||
    lower.includes("property") ||
    lower.includes("building") ||
    lower.includes("address") ||
    lower.includes("roof") ||
    lower.includes("storey") ||
    lower.includes("suburb") ||
    lower.includes("postcode")
  ) {
    return "Property & Site";
  }
  if (
    lower.includes("consent") ||
    lower.includes("marketing") ||
    lower.includes("opt") ||
    lower.includes("dnd") ||
    lower.includes("sms") ||
    lower.includes("email")
  ) {
    return "Consent & Communication";
  }
  if (
    lower.includes("source") ||
    lower.includes("lead") ||
    lower.includes("campaign") ||
    lower.includes("referral") ||
    lower.includes("channel")
  ) {
    return "Lead Source";
  }
  if (
    lower.includes("billing") ||
    lower.includes("invoice") ||
    lower.includes("payment") ||
    lower.includes("abn") ||
    lower.includes("acn") ||
    lower.includes("bank")
  ) {
    return "Billing & Accounts";
  }
  if (
    lower.includes("insulation") ||
    lower.includes("foam") ||
    lower.includes("scope") ||
    lower.includes("sqm") ||
    lower.includes("pitch")
  ) {
    return "Scope & Specifications";
  }
  return "General";
}

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export class CrmError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function crmJson(path: string, init?: RequestInit): Promise<Obj> {
  const r = await crmFetch(path, init);
  const j = (await r.json().catch(() => ({}))) as Obj;
  if (!r.ok) {
    const m = Array.isArray(j.message)
      ? j.message.join("; ")
      : String(j.message ?? j.error ?? "CRM error");
    throw new CrmError(r.status, m.slice(0, 200));
  }
  return j;
}

/** Wrap a handler body so config and CRM failures become clean JSON errors (no secrets, no raw bodies). */
export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConfigError) return jsonError(503, "Access not configured");
    if (e instanceof CrmError)
      return jsonError(
        e.status === 404 ? 404 : 502,
        e.status === 404 ? "Not found" : "CRM request failed (" + e.status + ")",
      );
    return jsonError(500, "Server error");
  }
}

const TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; v: unknown }>();
export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v as T;
  const v = await load();
  cache.set(key, { at: Date.now(), v });
  return v;
}

export function dropCached(key: string): void {
  cache.delete(key);
}

export function getPipelines(): Promise<Pipeline[]> {
  const L = getConfig().locationId;
  return cached("pipelines:" + L, async () => {
    const j = await crmJson("/opportunities/pipelines?locationId=" + L);
    return ((j.pipelines ?? []) as Obj[]).map((p) => ({
      id: String(p.id),
      name: String(p.name ?? ""),
      stages: ((p.stages ?? []) as Obj[]).map((s) => ({
        id: String(s.id),
        name: String(s.name ?? ""),
      })),
    }));
  });
}

/** Short keys of the two job fields that already exist in the CRM account (used by id, never created here). */
export const SITE_ADDRESS_KEY = "site_address";
export const ACCESS_NOTES_KEY = "access_notes";

/** The custom field with this short key (the CRM stores it as opportunity.<key>), or undefined. */
export function oppFieldByKey(fields: OppField[], key: string): OppField | undefined {
  return fields.find((d) => d.key === key || d.key === "opportunity." + key);
}

export function getOppFields(): Promise<OppField[]> {
  const L = getConfig().locationId;
  return cached("oppfields:" + L, async () => {
    const j = await crmJson("/locations/" + L + "/customFields?model=opportunity");
    const list = Array.isArray(j.customFields)
      ? (j.customFields as Obj[])
      : Array.isArray(j.fields)
        ? (j.fields as Obj[])
        : [];
    return list.map((f) => {
      const name = String(f.name ?? f.fieldKey ?? f.key ?? "");
      const key = String(f.fieldKey ?? f.key ?? "");
      const group = String(f.fieldGroup ?? f.group ?? f.folderName ?? f.folder ?? f.category ?? "");
      return {
        id: String(f.id ?? f._id ?? ""),
        key,
        name,
        dataType: String(f.dataType ?? ""),
        options: Array.isArray(f.picklistOptions)
          ? f.picklistOptions.map(String)
          : Array.isArray(f.options)
            ? f.options.map(String)
            : [],
        fieldKey: key,
        fieldGroup: group || undefined,
        category: inferCategory(name, key, group),
      };
    });
  });
}

export function mapContact(c: Obj): Contact {
  const first = String(c.firstName ?? "");
  const last = String(c.lastName ?? "");
  const out: Contact = {
    id: String(c.id ?? c._id ?? ""),
    name: String(c.contactName ?? (`${first} ${last}`.trim() || c.name || "")),
    email: String(c.email ?? ""),
    phone: String(c.phone ?? ""),
    suburb: String(c.city ?? ""),
  };
  if (c.companyName) out.companyName = String(c.companyName);
  if (Array.isArray(c.customFields)) {
    out.customFields = (c.customFields as Obj[]).map((f) => ({
      id: String(f.id ?? f._id ?? ""),
      name: String(f.name ?? ""),
      value: (f.fieldValueString ?? f.fieldValueNumber ?? f.fieldValue ?? null) as
        string | number | null,
    }));
  }
  return out;
}

export async function mapJob(o: Obj, pipelines?: Pipeline[], fields?: OppField[]): Promise<Job> {
  const pl = pipelines ?? (await getPipelines());
  const fl = fields ?? (await getOppFields());
  const pipe = pl.find((p) => p.id === o.pipelineId);
  const stage = pipe?.stages.find((s) => s.id === o.pipelineStageId);
  const ct: Obj = o.contact ?? {};
  const customFields: JobField[] = ((o.customFields ?? []) as Obj[]).map((f) => ({
    id: String(f.id),
    name: fl.find((d) => d.id === f.id)?.name ?? "",
    value: (f.fieldValueString ??
      f.fieldValueNumber ??
      f.fieldValueDate ??
      f.fieldValue ??
      null) as string | number | null,
  }));
  const textOf = (key: string): string => {
    const d = oppFieldByKey(fl, key);
    const hit = d ? customFields.find((f) => f.id === d.id) : undefined;
    return hit && hit.value !== null ? String(hit.value) : "";
  };
  const siteAddress = textOf(SITE_ADDRESS_KEY);
  const accessNotes = textOf(ACCESS_NOTES_KEY);
  // lastStageChangeAt and createdAt are proven in Dev (TEST-REPORT). The other variants and source/assignedTo are tolerant reads: UNTESTED.
  const iso = (...v: unknown[]): string => {
    const hit = v.find((x) => typeof x === "string" && x !== "" && !Number.isNaN(Date.parse(x))) as
      string | undefined;
    return hit ? new Date(hit).toISOString() : "";
  };
  const createdAt = iso(o.createdAt, o.dateAdded);
  const out: Job = {
    id: String(o.id ?? o._id ?? ""),
    contactId: String(o.contactId ?? ct.id ?? ""),
    contactName: String(ct.name ?? ct.contactName ?? (`${ct.firstName ?? ""} ${ct.lastName ?? ""}`.trim() || "")),
    title: String(o.name ?? ""),
    address: siteAddress,
    siteAddress,
    accessNotes,
    stage: stage?.name ?? "",
    status: String(o.status ?? ""),
    monetaryValue: Number(o.monetaryValue ?? 0),
    pipelineName: pipe?.name ?? "",
    customFields,
    ownerId: String(o.assignedTo ?? ""),
    source: String(o.source ?? ""),
    createdAt,
    stageSince: iso(o.lastStageChangeAt, o.lastStatusChangeAt, o.dateUpdated) || createdAt,
  };
  if (ct.companyName) out.companyName = String(ct.companyName);
  return out;
}
