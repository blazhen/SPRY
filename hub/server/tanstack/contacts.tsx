// Copy to src/routes/api/contacts.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/contacts";

export const Route = createFileRoute("/api/contacts")({
  server: { handlers: { GET: async ({ request }) => handler.GET(request) } },
});
