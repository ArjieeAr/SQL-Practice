"use server";

import { redirect } from "next/navigation";

import { proposalSchema, type ProposalInput } from "@/lib/problems/authoring";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ProposalState {
  error?: string;
}

/** Per-user budget: every proposal is something an admin has to read. */
const RATE_LIMIT = { windowMs: 24 * 60 * 60_000, maxProposals: 5 };

const orNull = (sql: string) => (sql.trim() === "" ? null : sql);

/**
 * Save a user's proposal. Clients have no write access to proposals, so nothing here can be skipped
 * by calling Supabase directly: the user comes from the verified session, the input is validated,
 * and the row (always pending) is written with the service role.
 */
export async function createProposal(
  _prev: ProposalState,
  input: ProposalInput,
): Promise<ProposalState> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const proposal = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "Your session expired. Sign in again." };

  // Counted through the user's own client, so RLS scopes it to their proposals. Two requests
  // racing can both slip under the limit; that's acceptable for a soft abuse guard.
  const since = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();
  const { count, error: countError } = await supabase
    .from("problem_proposals")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (countError) return { error: "Could not check your proposal limit." };
  if ((count ?? 0) >= RATE_LIMIT.maxProposals) {
    return {
      error: `You can send ${RATE_LIMIT.maxProposals} proposals a day. Please try again tomorrow.`,
    };
  }

  const adminClient = await getAdminClient();
  const { error } = await adminClient.from("problem_proposals").insert({
    user_id: auth.claims.sub,
    title: proposal.title,
    difficulty: proposal.difficulty,
    tags: proposal.tags,
    description_md: proposal.descriptionMd,
    schema_sql: orNull(proposal.schemaSql),
    sample_data_sql: orNull(proposal.sampleDataSql),
    solution_sql: orNull(proposal.solutionSql),
    cases: proposal.cases,
  });
  if (error) {
    console.error(`[proposals] failed to save proposal: ${error.message}`);
    return { error: "Could not save your proposal." };
  }

  redirect("/proposals");
}
