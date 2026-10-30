// Copy to src/routes/api/public.quote.respond.tsx. Set the import below to wherever handlers/ was copied (see README).
// Public route: no staff token. The per-quote key in the link is the access.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/public-quote-respond";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";

async function ensureStore() {
  if (await getStore()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  setStore(createSupabaseStore(supabaseAdmin as never));
}

export const Route = createFileRoute("/api/public/quote/respond")({
  server: {
    handlers: {
      POST: async ({ request }) => { await ensureStore(); return handler.POST(request); },
    },
  },
});
