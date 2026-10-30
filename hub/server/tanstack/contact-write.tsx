// Replaces tanstack/contact.tsx (one route file per path): GET from handlers/contact, POST and PUT from handlers/contact-write.
// Copy to src/routes/api/contact.tsx. Set the imports below to wherever handlers/ was copied (see README).
import { createFileRoute } from "@tanstack/react-router";
import * as read from "@/server-hub/handlers/contact";
import * as write from "@/server-hub/handlers/contact-write";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      GET: async ({ request }) => read.GET(request),
      POST: async ({ request }) => write.POST(request),
      PUT: async ({ request }) => write.PUT(request),
    },
  },
});
