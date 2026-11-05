// Copy to src/routes/api/files.tsx. Set the imports below to wherever handlers/, lib/ and store/ were copied (see README).
// Runs on the server only: the admin client bypasses RLS and storage rules and must never reach browser code.
import { createFileRoute } from "@tanstack/react-router";
import * as handler from "@/server-hub/handlers/files";
import { getStore, setStore } from "@/server-hub/store/index";
import { createSupabaseStore } from "@/server-hub/store/supabase";
import { getFileStorage, setFileStorage } from "@/server-hub/lib/files";
import { createSupabaseFiles } from "@/server-hub/store/files-supabase";

async function ensureStore() {
  if ((await getStore()) && (await getFileStorage())) return;
  // The admin client lives in the generated Cloud integration, which only exists once Cloud is enabled.
  // @ts-ignore: module is generated when Cloud is turned on; absent before that.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!(await getStore())) setStore(createSupabaseStore(supabaseAdmin as never));
  if (!(await getFileStorage())) setFileStorage(createSupabaseFiles(supabaseAdmin as never));
}

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureStore();
        return handler.GET(request);
      },
      POST: async ({ request }) => {
        await ensureStore();
        return handler.POST(request);
      },
      DELETE: async ({ request }) => {
        await ensureStore();
        return handler.DELETE(request);
      },
    },
  },
});
