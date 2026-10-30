// Copy to src/routes/api/users.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/users";

export const Route = createFileRoute("/api/users")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
    },
  },
});
