// Copy to src/routes/api/invoices.payment.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/invoices-payment";

export const Route = createFileRoute("/api/invoices/payment")({
  server: {
    handlers: {
      POST: async ({ request }) => handler.POST(request),
    },
  },
});
