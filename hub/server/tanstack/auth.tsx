// Copy to src/routes/api/auth.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/auth";

export const Route = createFileRoute("/api/auth")({
  server: { handlers: { GET: async ({ request }) => handler.GET(request) } },
});
