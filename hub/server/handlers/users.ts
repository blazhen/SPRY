import { gate } from "../lib/auth.js";
import { guard } from "../lib/crm.js";
import { getUsers } from "../lib/crm-extended.js";
import { jsonOk } from "../lib/http.js";

// GET /api/users -> { users: [{ id, name }] }. Proven in Dev (step21): GET /users/?locationId= lists users (names only are returned here).
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => jsonOk({ users: await getUsers() }));
}
