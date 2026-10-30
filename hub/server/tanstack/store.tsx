// Copy to src/routes/api/store.tsx. Set the import below to wherever handlers/ and store/ were copied (see README).
// Runs on the server only: the admin client bypasses RLS and must never reach browser code.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/store";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";

async function ensureStore() {
  if (await getStore()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  setStore(createSupabaseStore(supabaseAdmin as never));
}

export const Route = createFileRoute("/api/store")({
  server: {
    handlers: {
      GET: async ({ request }) => { await ensureStore(); return handler.GET(request); },
      PUT: async ({ request }) => { await ensureStore(); return handler.PUT(request); },
      DELETE: async ({ request }) => { await ensureStore(); return handler.DELETE(request); },
    },
  },
});
