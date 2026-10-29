import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProblemStatus = "solved" | "attempted";

/**
 * The signed-in user's status per problem slug; empty for signed-out visitors.
 * Reads cookies, so it is per-request: render it inside a <Suspense> boundary.
 */
export async function getMyProblemStatuses(): Promise<Record<string, ProblemStatus>> {
  const supabase = await createClient();
  // getClaims() verifies the session JWT; RLS then limits rows to this user anyway.
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return {};

  const { data, error } = await supabase
    .from("user_problem_status")
    .select("solved_at, problems!inner(slug)");
  if (error) throw new Error(`Failed to load progress: ${error.message}`);

  return Object.fromEntries(
    data.map((row) => [row.problems.slug, row.solved_at ? "solved" : "attempted"] as const),
  );
}
