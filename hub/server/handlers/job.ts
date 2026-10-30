import { gate } from '../lib/auth.js';
import { crmJson, getOppFields, getPipelines, guard, mapJob } from '../lib/crm.js';
import { ID, stageIdForName } from '../lib/crm-extended.js';
import { jsonError, jsonOk, readJson } from '../lib/http.js';

const STATUSES = ['open', 'won', 'lost', 'abandoned'];

// PUT /api/job?id= { stage?, monetaryValue?, name?, assignedTo?, status?, customFields?: [{key|id, value}] } -> { job }
// Proven in Dev (step20): PUT /opportunities/{id} with pipelineStageId, monetaryValue, customFields [{id, field_value}],
// and PUT /opportunities/{id}/status. assignedTo and name on the same PUT are UNTESTED until run on Dev.
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!ID.test(id)) return jsonError(400, 'Bad id');
    const b = await readJson(request);
    if (!b) return jsonError(400, 'Bad request');
    const body: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 200);
      if (!name) return jsonError(400, 'Bad name');
      body.name = name;
    }
    if (b.monetaryValue !== undefined) {
      const v = Number(b.monetaryValue);
      if (!Number.isFinite(v) || v < 0) return jsonError(400, 'Bad monetaryValue');
      body.monetaryValue = v;
    }
    if (b.assignedTo !== undefined) {
      const a = String(b.assignedTo);
      if (!ID.test(a)) return jsonError(400, 'Bad assignedTo');
      body.assignedTo = a;
    }
    const status = b.status === undefined ? undefined : String(b.status);
    if (status !== undefined && !STATUSES.includes(status)) return jsonError(400, 'Bad status');
    if (b.customFields !== undefined && !Array.isArray(b.customFields)) return jsonError(400, 'Bad customFields');
    if (b.stage !== undefined && !String(b.stage).trim()) return jsonError(400, 'Bad stage');
    if (Object.keys(body).length === 0 && status === undefined && b.stage === undefined && b.customFields === undefined) return jsonError(400, 'Nothing to update');

    const [pipelines, fields] = await Promise.all([getPipelines(), getOppFields()]);
    if (b.stage !== undefined) {
      const cur = ((await crmJson('/opportunities/' + id)).opportunity ?? {}) as Record<string, unknown>;
      const stageId = stageIdForName(pipelines, String(cur.pipelineId ?? ''), String(b.stage));
      if (!stageId) return jsonError(400, 'Unknown stage');
      body.pipelineStageId = stageId;
    }
    if (Array.isArray(b.customFields)) {
      const cf: { id: string; field_value: unknown }[] = [];
      for (const raw of b.customFields as Record<string, unknown>[]) {
        const key = String(raw?.key ?? '');
        const f = fields.find((d) => (raw?.id !== undefined && d.id === raw.id) || (key !== '' && (d.key === key || d.key === 'opportunity.' + key)));
        if (!f) return jsonError(400, 'Unknown custom field');
        cf.push({ id: f.id, field_value: raw.value });
      }
      body.customFields = cf;
    }
    if (Object.keys(body).length > 0) await crmJson('/opportunities/' + id, { method: 'PUT', body: JSON.stringify(body) });
    if (status !== undefined) await crmJson('/opportunities/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) });
    const o = ((await crmJson('/opportunities/' + id)).opportunity ?? {}) as Record<string, unknown>;
    return jsonOk({ job: await mapJob(o, pipelines, fields) });
  });
}
