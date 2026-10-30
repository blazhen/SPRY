// Copy to src/routes/api/opportunity-fields.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/opportunity-fields";

export const Route = createFileRoute("/api/opportunity-fields")({
  server: { handlers: { GET: async ({ request }) => handler.GET(request) } },
});
