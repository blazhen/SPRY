// Copy to src/routes/api/invoices.tsx. Set the import below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/invoices";

export const Route = createFileRoute("/api/invoices")({
  server: {
    handlers: {
      GET: async ({ request }) => handler.GET(request),
      POST: async ({ request }) => handler.POST(request),
      PUT: async ({ request }) => handler.PUT(request),
      DELETE: async ({ request }) => handler.DELETE(request),
    },
  },
});
