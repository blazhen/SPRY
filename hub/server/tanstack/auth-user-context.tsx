// Copy to src/routes/auth.user-context.tsx (NOT src/routes/api: the path is /auth/user-context). Set the import below to wherever handlers/ was copied (see README).
// Turns the encrypted user data from the platform into a signed Hub session. Same-origin only; the shared secret is the access.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/auth-user-context";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";

async function ensureStore() {
  if (await getStore()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  setStore(createSupabaseStore(supabaseAdmin as never));
}

export const Route = createFileRoute("/auth/user-context")({
  server: {
    handlers: {
      POST: async ({ request }) => { await ensureStore(); return handler.POST(request); },
    },
  },
});
