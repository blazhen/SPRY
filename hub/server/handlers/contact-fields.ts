import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { ID } from "../lib/crm-extended.js";
import { isExtraDef, mapContactFull } from "../lib/contact-extra.js";
import { getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";

// GET /api/contact-fields : the contact custom field definitions for this location.
// PUT /api/contact-fields?id= { values: [{ id, value }] } : update one contact's custom field values, return the contact.

const L = () => getConfig().locationId;

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ContactFieldDef {
  id: string;
  key: string;
  name: string;
  dataType: string;
  options: string[];
  fieldGroup?: string;
  category?: string;
}

function inferCategory(name: string, key: string, group?: string): string {
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

function mapFieldDef(f: Obj): ContactFieldDef {
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
    fieldGroup: group || undefined,
    category: inferCategory(name, key, group),
  };
}

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    // CRM contact custom field definitions, scoped to the Dev location (fixed server-side).
    const j = await crmJson("/locations/" + L() + "/customFields?model=contact");
    // The three fields the Hub fills in itself (mobile, home address, private note) are not offered here.
    const fields = ((j.customFields ?? []) as Obj[]).map(mapFieldDef).filter((f) => !isExtraDef(f));
    return jsonOk({ fields });
  });
}

export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ID.test(id)) return jsonError(400, "Bad id");
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const values = Array.isArray(b.values) ? (b.values as Obj[]) : null;
    if (!values) return jsonError(400, "values is required");
    // Pull the current contact so we keep any fields we are not setting, then layer the new values on top.
    const cur = ((await crmJson("/contacts/" + id)).contact ?? {}) as Obj;
    const merged: Record<string, unknown> = {};
    if (Array.isArray(cur.customFields)) {
      for (const f of cur.customFields as Obj[]) {
        const fid = String(f.id ?? f._id ?? "");
        if (fid) merged[fid] = f.fieldValue ?? f.value ?? "";
      }
    }
    for (const v of values) {
      const fid = String(v.id ?? "");
      if (!fid) return jsonError(400, "Bad field id");
      merged[fid] = v.value ?? "";
    }
    const body: Record<string, unknown> = {
      locationId: L(),
      customFields: Object.entries(merged).map(([fid, val]) => ({
        id: fid,
        field_value: val,
      })),
    };
    await crmJson("/contacts/" + id + "/customFields", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const fresh = ((await crmJson("/contacts/" + id)).contact ?? {}) as Obj;
    if (!fresh.id && !fresh._id) return jsonError(404, "Not found");
    const out = await mapContactFull(fresh);
    const fields = (Array.isArray(fresh.customFields) ? fresh.customFields : []) as Obj[];
    return jsonOk({
      contact: {
        ...out,
        customFields: fields.map((f) => ({
          id: String(f.id ?? f._id ?? ""),
          name: String(f.name ?? ""),
          value: (f.fieldValue ?? f.fieldValueString ?? f.fieldValueNumber ?? null) as
            string | number | null,
        })),
      },
    });
  });
}
