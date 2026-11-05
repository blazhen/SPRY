// Copy to src/routes/api/notes-to-quote.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/notes-to-quote";

export const Route = createFileRoute("/api/notes-to-quote")({
  server: {
    handlers: {
      POST: async ({ request }) => handler.POST(request),
    },
  },
});
