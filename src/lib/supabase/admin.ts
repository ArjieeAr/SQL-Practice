import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | undefined;

/**
 * Service-role client: bypasses RLS. Used only by the grader, to read hidden test cases and
 * reference solutions and to record submissions. Never acts on behalf of a request's cookies.
 *
 * Created lazily so the secret is only required when grading actually runs; `next build` imports
 * route modules and must not need it (CI builds without the secret).
 */
export async function getAdminClient(): Promise<SupabaseClient<Database>> {
  if (!client) {
    const { serverEnv } = await import("@/lib/env.server");
    client = createClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
