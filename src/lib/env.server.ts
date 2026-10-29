import "server-only";

import { z } from "zod";

/**
 * Server-only secrets. `server-only` makes any accidental import from a Client Component a build
 * error, so the secret key can never end up in the browser bundle.
 */
export const serverEnv = z
  .object({ SUPABASE_SECRET_KEY: z.string().min(1) })
  .parse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
