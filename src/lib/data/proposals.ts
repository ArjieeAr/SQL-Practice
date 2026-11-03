import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type MyProposal = Pick<
  Tables<"problem_proposals">,
  "id" | "title" | "difficulty" | "status" | "review_note" | "created_at"
> & {
  /** Only set once the problem is published: drafts aren't visible through RLS. */
  problem: Pick<Tables<"problems">, "slug"> | null;
};

/** The signed-in user's proposals, newest first. RLS scopes this to their own. */
export async function getMyProposals(): Promise<MyProposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("problem_proposals")
    .select(
      "id, title, difficulty, status, review_note, created_at, problem:problems!problem_proposals_problem_id_fkey(slug)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load proposals: ${error.message}`);
  return data;
}
