// Copy to src/routes/api/tasks.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/tasks";

export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
      POST: async ({ request }) => handler.POST(request),
      PUT: async ({ request }) => handler.PUT(request),
    },
  },
});
