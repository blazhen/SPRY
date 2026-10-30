// Copy to src/routes/api/jobs.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/jobs";

export const Route = createFileRoute("/api/jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
      POST: async ({ request }) => handler.POST(request),
    },
  },
});
