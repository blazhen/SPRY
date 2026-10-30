// Copy to src/routes/api/quote-link.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/quote-link";

export const Route = createFileRoute("/api/quote-link")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
    },
  },
});
