// Copy to src/routes/api/pipelines.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/pipelines";

export const Route = createFileRoute("/api/pipelines")({
  server: { handlers: { GET: async ({ request }) => handler.GET(request) } },
});
