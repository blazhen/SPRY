import { cached, crmJson, dropCached, mapContact, type Contact } from "./crm.js";
import { getConfig } from "./env.js";

// The three details the Hub keeps about a person that the CRM has no standard field for: mobile, home or office
// address and a private note. They are stored as contact custom fields in the CRM, created in the account on the
// first write if they are missing. Only the configured location is ever touched.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type ExtraProp = "mobile" | "homeAddress" | "privateNote";

export const EXTRA_FIELDS: { prop: ExtraProp; slug: string; name: string; dataType: string; max: number }[] = [
  { prop: "mobile", slug: "hub_mobile", name: "Hub mobile", dataType: "TEXT", max: 40 },
  { prop: "homeAddress", slug: "hub_home_address", name: "Hub home address", dataType: "TEXT", max: 300 },
  { prop: "privateNote", slug: "hub_private_note", name: "Hub private note", dataType: "LARGE_TEXT", max: 2000 },
];

export interface ContactDef {
  id: string;
  key: string;
  name: string;
}

const L = () => getConfig().locationId;
const tail = (key: string) => key.replace(/^contact\./, "");

/** True for the three fields the Hub fills in itself (they are not offered in the contact fields editor). */
export const isExtraDef = (d: { key: string; name: string }): boolean =>
  EXTRA_FIELDS.some((w) => tail(d.key) === w.slug || d.name.toLowerCase() === w.name.toLowerCase());

export function getContactDefs(): Promise<ContactDef[]> {
  return cached("contactdefs:" + L(), async () => {
    const j = await crmJson("/locations/" + L() + "/customFields?model=contact");
    const list = Array.isArray(j.customFields) ? (j.customFields as Obj[]) : [];
    return list.map((f) => ({
      id: String(f.id ?? f._id ?? ""),
      key: String(f.fieldKey ?? f.key ?? ""),
      name: String(f.name ?? ""),
    }));
  });
}

const defFor = (defs: ContactDef[], w: (typeof EXTRA_FIELDS)[number]) =>
  defs.find((d) => tail(d.key) === w.slug || d.name.toLowerCase() === w.name.toLowerCase());

/** The id of each of the three fields, creating the ones that are missing. */
export async function ensureExtraFields(): Promise<Record<ExtraProp, string>> {
  let defs = await getContactDefs();
  let created = false;
  for (const w of EXTRA_FIELDS) {
    if (defFor(defs, w)) continue;
    await crmJson("/locations/" + L() + "/customFields", {
      method: "POST",
      body: JSON.stringify({ name: w.name, dataType: w.dataType, model: "contact" }),
    });
    created = true;
  }
  if (created) {
    dropCached("contactdefs:" + L());
    defs = await getContactDefs();
  }
  const out = {} as Record<ExtraProp, string>;
  for (const w of EXTRA_FIELDS) {
    const d = defFor(defs, w);
    if (!d) throw new Error("contact field missing: " + w.slug);
    out[w.prop] = d.id;
  }
  return out;
}

/** mapContact plus mobile, home address and private note, when the CRM sent the contact's custom fields. */
export async function mapContactFull(c: Obj): Promise<Contact> {
  const out = mapContact(c);
  if (!Array.isArray(c.customFields)) return out;
  const defs = await getContactDefs().catch(() => [] as ContactDef[]);
  for (const w of EXTRA_FIELDS) {
    const d = defFor(defs, w);
    if (!d) continue;
    const hit = (c.customFields as Obj[]).find((f) => String(f.id ?? f._id ?? "") === d.id);
    const v = hit ? (hit.value ?? hit.fieldValueString ?? hit.fieldValue ?? "") : "";
    out[w.prop] = String(v ?? "");
  }
  return out;
}
