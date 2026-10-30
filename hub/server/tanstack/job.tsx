// Copy to src/routes/api/job.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/job";

export const Route = createFileRoute("/api/job")({
  server: {
    handlers: {
      PUT: async ({ request }) => handler.PUT(request),
    },
  },
});
