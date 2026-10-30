// Copy to src/routes/api/invoices.send.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/invoices-send";

export const Route = createFileRoute("/api/invoices/send")({
  server: {
    handlers: {
      POST: async ({ request }) => handler.POST(request),
    },
  },
});
