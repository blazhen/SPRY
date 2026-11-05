import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { getAssocIds, getRelationRefs, ID, listParticipants } from "../lib/crm-extended.js";
import { getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";

// Participants of a job: the main contact (the job's own contact), extra contacts and a company, linked by associations.
// Proven in Dev (step19): POST /associations/relations (contact side needs pipelineId), GET /associations/relations/{jobId}, DELETE /associations/relations/{relationId}.

const KINDS = ["contact", "company"];

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const jobId = new URL(request.url).searchParams.get("jobId") ?? "";
    if (!ID.test(jobId)) return jsonError(400, "Bad jobId");
    return jsonOk({ participants: await listParticipants(jobId) });
  });
}

// POST /api/participants { jobId, kind, id } : link. Already linked is not an error (no duplicate relation is made).
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const jobId = String(b.jobId ?? "");
    const id = String(b.id ?? "");
    const kind = String(b.kind ?? "");
    if (!ID.test(jobId) || !ID.test(id) || !KINDS.includes(kind))
      return jsonError(400, "jobId, kind (contact or company) and id are required");
    const L = getConfig().locationId;
    const opp = ((await crmJson("/opportunities/" + jobId)).opportunity ?? {}) as Record<
      string,
      unknown
    >;
    if (kind === "contact" && String(opp.contactId ?? "") === id)
      return jsonError(400, "That contact is already the main contact");
    const exists = (await getRelationRefs(jobId)).some((r) => r.kind === kind && r.id === id);
    if (!exists) {
      const assoc = await getAssocIds();
      const body: Record<string, unknown> = {
        locationId: L,
        associationId: kind === "contact" ? assoc.contactJob : assoc.companyJob,
        firstRecordId: id,
        secondRecordId: jobId,
      };
      if (kind === "contact") body.pipelineId = String(opp.pipelineId ?? "");
      await crmJson("/associations/relations", { method: "POST", body: JSON.stringify(body) });
    }
    return jsonOk({ participants: await listParticipants(jobId) });
  });
}

// DELETE /api/participants?jobId=&kind=&id= : unlink. The main contact cannot be removed here.
export async function DELETE(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const q = new URL(request.url).searchParams;
    const jobId = q.get("jobId") ?? "";
    const id = q.get("id") ?? "";
    const kind = q.get("kind") ?? "";
    if (!ID.test(jobId) || !ID.test(id) || !KINDS.includes(kind))
      return jsonError(400, "jobId, kind and id are required");
    const ref = (await getRelationRefs(jobId)).find((r) => r.kind === kind && r.id === id);
    if (!ref) return jsonError(404, "Not found");
    await crmJson(
      "/associations/relations/" + ref.relationId + "?locationId=" + getConfig().locationId,
      { method: "DELETE" },
    );
    return jsonOk({ participants: await listParticipants(jobId) });
  });
}
