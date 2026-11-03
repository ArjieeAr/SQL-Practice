"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/roles";
import { AUTHORING_LIMITS } from "@/lib/problems/authoring";
import { getAdminClient } from "@/lib/supabase/admin";

export interface RejectState {
  error?: string;
}

const rejectSchema = z.object({
  proposalId: z.uuid(),
  note: z
    .string()
    .trim()
    .min(1, "Tell the proposer why.")
    .max(AUTHORING_LIMITS.reviewNote, "Keep the note shorter."),
});

export async function rejectProposal(_prev: RejectState, formData: FormData): Promise<RejectState> {
  const reviewer = await requireAdmin();

  const parsed = rejectSchema.safeParse({
    proposalId: formData.get("proposalId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await getAdminClient();
  const { error } = await adminClient
    .from("problem_proposals")
    .update({
      status: "rejected",
      review_note: parsed.data.note,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.proposalId)
    .eq("status", "pending");
  if (error) return { error: error.message };

  refresh();
  return {};
}

/**
 * Take a problem off the site. There is deliberately no delete: submissions cascade from problems,
 * so deleting one would wipe users' history.
 */
export async function unpublishProblem(problemId: string): Promise<void> {
  await requireAdmin();

  const adminClient = await getAdminClient();
  const { error } = await adminClient
    .from("problems")
    .update({ is_published: false })
    .eq("id", z.uuid().parse(problemId));
  if (error) throw new Error(`Failed to unpublish: ${error.message}`);

  updateTag("problems");
  refresh();
}
