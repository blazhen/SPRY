// Copy to src/routes/api/participants.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/participants";

export const Route = createFileRoute("/api/participants")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
      POST: async ({ request }) => handler.POST(request),
      DELETE: async ({ request }) => handler.DELETE(request),
    },
  },
});
