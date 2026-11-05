import { gate } from "../lib/auth.js";
import { getPipelines, guard } from "../lib/crm.js";
import { jsonOk } from "../lib/http.js";

// GET /api/pipelines : pipelines with stages (cached 5 minutes in getPipelines).
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => jsonOk({ pipelines: await getPipelines() }));
}
