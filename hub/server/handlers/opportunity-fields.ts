import { gate } from "../lib/auth.js";
import { getOppFields, guard } from "../lib/crm.js";
import { jsonOk } from "../lib/http.js";

// GET /api/opportunity-fields : every job custom field definition exactly as the CRM has it,
// plus the category (folder) each field falls into so the Hub can filter which to show.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const fields = await getOppFields();
    const categories = Array.from(new Set(fields.map((f) => f.category || "General"))).sort();
    return jsonOk({ fields, categories });
  });
}
