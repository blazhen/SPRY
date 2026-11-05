import { gate } from "../lib/auth.js";
import {
  ACCESS_NOTES_KEY,
  SITE_ADDRESS_KEY,
  crmJson,
  getOppFields,
  getPipelines,
  guard,
  mapJob,
  oppFieldByKey,
} from "../lib/crm.js";
import { getConfig } from "../lib/env.js";
import { intParam, jsonError, jsonOk, readJson } from "../lib/http.js";

const PAGE = 20;
const MAX_PAGE_SIZE = 100;
const ID = /^[A-Za-z0-9]{6,64}$/;
const STATUSES = ["open", "won", "lost", "all"];

// GET /api/jobs?contactId= : jobs of one contact (every status).
// GET /api/jobs?all=1&status=open|won|lost|all&page=&pageSize= : every job with that status (default open), pageSize 1 to 100 (default 20).
// Both return page, pageSize, total and hasMore.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId") ?? "";
    if (contactId && !ID.test(contactId)) return jsonError(400, "Bad contactId");
    const status = url.searchParams.get("status") ?? "open";
    if (!STATUSES.includes(status)) return jsonError(400, "Bad status");
    const page = intParam(url, "page", 1);
    const pageSize = intParam(url, "pageSize", PAGE, 1, MAX_PAGE_SIZE);
    let path =
      "/opportunities/search?location_id=" +
      getConfig().locationId +
      "&limit=" +
      pageSize +
      "&page=" +
      page;
    path += contactId ? "&contact_id=" + contactId : "&status=" + status;
    const j = await crmJson(path);
    const [pl, fl] = await Promise.all([getPipelines(), getOppFields()]);
    const jobs = await Promise.all(
      ((j.opportunities ?? []) as Record<string, unknown>[]).map((o) => mapJob(o, pl, fl)),
    );
    const total = Number((j.meta as { total?: number } | undefined)?.total ?? jobs.length);
    return jsonOk({ jobs, page, pageSize, total, hasMore: page * pageSize < total });
  });
}

// POST /api/jobs {contactId, title, monetaryValue?, pipelineId?, siteAddress?, accessNotes?} : siteAddress and accessNotes are
// written to the existing opportunity custom fields site_address and access_notes (by id; refused with 400 if the account
// has no such field and a text was given; nothing is created). Create a job in the stage named by
// SPRY_NEW_JOB_STAGE (default "New lead"). If that stage is not in the pipeline, the first stage is used
// and the response carries the header X-Stage-Fallback: 1.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const contactId = String(b.contactId ?? "");
    const title = String(b.title ?? "")
      .trim()
      .slice(0, 200);
    if (!ID.test(contactId) || !title) return jsonError(400, "contactId and title are required");
    const value = b.monetaryValue === undefined ? 0 : Number(b.monetaryValue);
    if (!Number.isFinite(value) || value < 0) return jsonError(400, "Bad monetaryValue");
    const named: { key: string; text: string }[] = [];
    for (const [prop, key, max] of [
      ["siteAddress", SITE_ADDRESS_KEY, 500],
      ["accessNotes", ACCESS_NOTES_KEY, 4000],
    ] as const) {
      if (b[prop] === undefined) continue;
      if (typeof b[prop] !== "string") return jsonError(400, "Bad " + prop);
      const text = (b[prop] as string).trim().slice(0, max);
      if (text) named.push({ key, text });
    }
    const cf: { id: string; field_value: unknown }[] = [];
    if (named.length > 0) {
      const fields = await getOppFields();
      for (const n of named) {
        const f = oppFieldByKey(fields, n.key);
        if (!f) return jsonError(400, "Unknown custom field");
        cf.push({ id: f.id, field_value: n.text });
      }
    }
    const c = getConfig();
    const pipelines = await getPipelines();
    const pipe = b.pipelineId ? pipelines.find((p) => p.id === b.pipelineId) : pipelines[0];
    if (!pipe || pipe.stages.length === 0) return jsonError(400, "Pipeline not found");
    const wanted = pipe.stages.find((s) => s.name.toLowerCase() === c.newJobStage.toLowerCase());
    const stage = wanted ?? pipe.stages[0];
    const j = await crmJson("/opportunities/", {
      method: "POST",
      body: JSON.stringify({
        pipelineId: pipe.id,
        locationId: c.locationId,
        name: title,
        pipelineStageId: stage.id,
        status: "open",
        contactId,
        monetaryValue: value,
        ...(cf.length > 0 ? { customFields: cf } : {}),
      }),
    });
    const o = (j.opportunity ?? j) as Record<string, unknown>;
    const job = await mapJob(o);
    const res = jsonOk({ job }, 201);
    if (!wanted) res.headers.set("X-Stage-Fallback", "1");
    return res;
  });
}
