import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cookie-less client for public data (published problems). Because it doesn't depend on the
 * request, its results can be cached with "use cache" and shared by every visitor.
 * It uses the publishable key, so it sees exactly what a signed-out visitor sees under RLS.
 */
export const publicClient = createClient<Database>(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
