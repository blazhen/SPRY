import { gate } from '../lib/auth.js';
import { getOppFields, guard } from '../lib/crm.js';
import { jsonOk } from '../lib/http.js';

// GET /api/opportunity-fields : the job custom field definitions, exactly as the CRM has them.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => jsonOk({ fields: await getOppFields() }));
}
