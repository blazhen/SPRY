// Copy to src/routes/api/invoices.void.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/invoices-void";

export const Route = createFileRoute("/api/invoices/void")({
  server: {
    handlers: {
      POST: async ({ request }) => handler.POST(request),
    },
  },
});
