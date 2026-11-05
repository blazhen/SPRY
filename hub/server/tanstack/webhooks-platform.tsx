// Copy to src/routes/webhooks.platform.tsx (NOT src/routes/api: the path is /webhooks/platform). Set the import below to wherever handlers/ was copied (see README).
// Install and uninstall events from the platform. No staff token: appId (and a signature when configured) is what is checked.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/webhooks-platform";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";

async function ensureStore() {
  if (await getStore()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  setStore(createSupabaseStore(supabaseAdmin as never));
}

export const Route = createFileRoute("/webhooks/platform")({
  server: {
    handlers: {
      POST: async ({ request }) => { await ensureStore(); return handler.POST(request); },
    },
  },
});
