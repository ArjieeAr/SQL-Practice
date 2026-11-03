import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getViewer } from "@/lib/auth/roles";
import type { EditorResponse } from "@/lib/problems/admin-api";
import {
  authoredProblemSchema,
  checkProblemShape,
  type AuthoredProblem,
} from "@/lib/problems/authoring";
import { checkPublishRules, verifyProblem, type ProblemVerification } from "@/lib/problems/verify";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

// Verifying boots a WASM Postgres per dataset; a cold function can take several seconds.
export const maxDuration = 60;

const bodySchema = z.object({
  intent: z.enum(["verify", "draft", "publish"]),
  problemId: z.uuid().optional(),
  proposalId: z.uuid().optional(),
  problem: authoredProblemSchema,
});

const savedSchema = z.object({ id: z.string(), slug: z.string() });

function reply(body: EditorResponse, status = 200) {
  return Response.json(body, { status });
}

/** Write a problem and its hidden parts in one transaction (see the save_problem function). */
async function saveProblem(
  problem: AuthoredProblem,
  options: {
    problemId?: string;
    proposalId?: string;
    reviewerId: string;
    verification?: ProblemVerification;
  },
) {
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient.rpc("save_problem", {
    payload: {
      id: options.problemId,
      proposal_id: options.proposalId,
      reviewer_id: options.reviewerId,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      description_md: problem.descriptionMd,
      schema_sql: problem.schemaSql,
      sample_data_sql: problem.sampleDataSql,
      order_matters: problem.orderMatters,
      is_published: options.verification !== undefined,
      // RawResult is plain JSON data; the cast only bridges interface vs. index-signature types.
      sample_expected: options.verification?.sampleExpected as unknown as Json,
      sample_tables: options.verification?.sampleTables as unknown as Json,
      reference_sql: problem.solutionSql,
      pitfalls: problem.pitfalls,
      cases: problem.cases,
    },
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Another problem already uses that URL. Choose a different one." };
    }
    // Raised by save_problem itself, e.g. the proposal was rejected in the meantime.
    if (error.code === "P0001") return { error: error.message };
    console.error(`[admin] failed to save problem: ${error.message}`);
    return { error: "Could not save the problem." };
  }

  // Expire straight away so the change is live on the next request; this is a route handler, so
  // updateTag isn't available. Saved drafts count too: saving one can unpublish a problem.
  revalidateTag("problems", { expire: 0 });
  return { saved: savedSchema.parse(data) };
}

/**
 * Verify, save or publish a problem. Publishing re-verifies on the server regardless of what the
 * editor last showed, so a problem can't go live without passing the sandbox.
 *
 * Non-admins get the same 404 as a route that doesn't exist.
 */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return reply({ ok: false, error: "Not found." }, 404);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  }
  const { intent, problemId, proposalId, problem } = parsed.data;
  const options = { problemId, proposalId, reviewerId: viewer.id };

  if (intent === "draft") {
    const result = await saveProblem(problem, options);
    if (result.error !== undefined) return reply({ ok: false, error: result.error }, 422);
    return reply({ ok: true, intent, ...result.saved });
  }

  const shapeIssues = checkProblemShape(problem);
  if (shapeIssues.length > 0) {
    return reply(
      { ok: false, error: "This problem isn't complete yet.", issues: shapeIssues },
      422,
    );
  }

  let verification: ProblemVerification;
  try {
    verification = await verifyProblem(problem);
  } catch (err) {
    // The author's SQL failed in the sandbox: show them why.
    return reply({ ok: false, error: (err as Error).message }, 422);
  }
  const issues = checkPublishRules(problem, verification);

  if (intent === "verify") return reply({ ok: true, intent, issues, verification });
  if (issues.length > 0) {
    return reply(
      { ok: false, error: "This problem can't be published yet.", issues, verification },
      422,
    );
  }

  const result = await saveProblem(problem, { ...options, verification });
  if (result.error !== undefined) return reply({ ok: false, error: result.error }, 422);
  return reply({ ok: true, intent, ...result.saved });
}
