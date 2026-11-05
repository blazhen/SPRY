// Copy to src/routes/oauth.callback.tsx (NOT src/routes/api: the path is /oauth/callback). Set the import below to wherever handlers/ was copied (see README).
// Install redirect: no staff token (the platform's redirect carries none). The one-time code is the access, and it only works with our client secret.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/oauth-callback";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";

async function ensureStore() {
  if (await getStore()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  setStore(createSupabaseStore(supabaseAdmin as never));
}

export const Route = createFileRoute("/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => { await ensureStore(); return handler.GET(request); },
    },
  },
});
