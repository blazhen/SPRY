// Copy to src/routes/api/tags.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/tags";

export const Route = createFileRoute("/api/tags")({
  server: {
    handlers: {
      POST: async ({ request }) => handler.POST(request),
      DELETE: async ({ request }) => handler.DELETE(request),
    },
  },
});
