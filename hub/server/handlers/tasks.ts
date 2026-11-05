import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { ID, mapTask } from "../lib/crm-extended.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";
import { dueToIso, TIME_RE } from "../lib/task-time.js";

// Tasks live on the contact. Contact task endpoints were exercised in the Dev matrix (step21);
// the Hub routes themselves are UNTESTED against the CRM until run on Dev.
const DATE = /^\d{4}-\d{2}-\d{2}/;

const timeOk = (v: unknown) => v === undefined || v === "" || (typeof v === "string" && TIME_RE.test(v));

/** The CRM date-time for a date (YYYY-MM-DD, or a full ISO date-time kept as it was) plus an optional HH:MM. null = bad. */
function dueFrom(date: string, time: unknown): string | null {
  if (date.length > 10 && !time) {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const day = date.slice(0, 10);
  if (Number.isNaN(new Date(day).getTime())) return null;
  return dueToIso(day, typeof time === "string" && time ? time : undefined);
}

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const contactId = new URL(request.url).searchParams.get("contactId") ?? "";
    if (!ID.test(contactId)) return jsonError(400, "Bad contactId");
    const j = await crmJson("/contacts/" + contactId + "/tasks");
    return jsonOk({ tasks: ((j.tasks ?? []) as Record<string, unknown>[]).map(mapTask) });
  });
}

// POST /api/tasks { contactId, title, description?, dueDate?, dueTime?, assignedTo? } -> 201 { task }
// The platform requires a due date, so a missing one defaults to tomorrow (UTC). description is the CRM task body;
// dueTime (HH:MM, business time zone) makes the CRM date-time that moment, none means all day (see lib/task-time.ts).
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
    if (b.dueDate !== undefined && b.dueDate !== "" && !DATE.test(String(b.dueDate)))
      return jsonError(400, "Bad dueDate");
    if (b.assignedTo !== undefined && b.assignedTo !== "" && !ID.test(String(b.assignedTo)))
      return jsonError(400, "Bad assignedTo");
    if (!timeOk(b.dueTime)) return jsonError(400, "Bad dueTime");
    if (b.description !== undefined && typeof b.description !== "string")
      return jsonError(400, "Bad description");
    const dueIso = dueFrom(b.dueDate ? String(b.dueDate) : new Date(Date.now() + 86400000).toISOString().slice(0, 10), b.dueTime);
    if (!dueIso) return jsonError(400, "Bad dueDate");
    const body: Record<string, unknown> = { title, dueDate: dueIso, completed: false };
    const description = typeof b.description === "string" ? b.description.trim().slice(0, 5000) : "";
    if (description) body.body = description;
    if (b.assignedTo) body.assignedTo = String(b.assignedTo);
    const j = await crmJson("/contacts/" + contactId + "/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return jsonOk({ task: mapTask((j.task ?? j) as Record<string, unknown>) }, 201);
  });
}

// PUT /api/tasks?contactId=&id= { completed?, title?, description?, dueDate?, dueTime? } -> { task }
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const q = new URL(request.url).searchParams;
    const contactId = q.get("contactId") ?? "";
    const id = q.get("id") ?? "";
    if (!ID.test(contactId) || !ID.test(id)) return jsonError(400, "contactId and id are required");
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const body: Record<string, unknown> = {};
    if (b.title !== undefined) {
      const title = String(b.title).trim().slice(0, 200);
      if (!title) return jsonError(400, "Bad title");
      body.title = title;
    }
    if (b.description !== undefined) {
      if (typeof b.description !== "string") return jsonError(400, "Bad description");
      body.body = b.description.trim().slice(0, 5000); // empty clears it
    }
    if (!timeOk(b.dueTime)) return jsonError(400, "Bad dueTime");
    if (b.dueDate !== undefined) {
      const iso = DATE.test(String(b.dueDate)) ? dueFrom(String(b.dueDate), b.dueTime) : null;
      if (!iso) return jsonError(400, "Bad dueDate");
      body.dueDate = iso; // a date sent without a time makes the task all day
    } else if (b.dueTime !== undefined && b.dueTime !== "") {
      return jsonError(400, "dueTime needs dueDate");
    }
    if (b.completed !== undefined && typeof b.completed !== "boolean")
      return jsonError(400, "Bad completed");
    if (Object.keys(body).length === 0 && b.completed === undefined)
      return jsonError(400, "Nothing to update");
    const base = "/contacts/" + contactId + "/tasks/" + id;
    if (Object.keys(body).length > 0)
      await crmJson(base, { method: "PUT", body: JSON.stringify(body) });
    if (b.completed !== undefined)
      await crmJson(base + "/completed", {
        method: "PUT",
        body: JSON.stringify({ completed: b.completed }),
      });
    const j = await crmJson(base);
    return jsonOk({ task: mapTask((j.task ?? j) as Record<string, unknown>) });
  });
}
