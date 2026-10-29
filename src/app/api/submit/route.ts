import { z } from "zod";

import { getGradingData } from "@/lib/data/grading";
import { gradeSubmission, GradingError } from "@/lib/grader/grade";
import { LIMITS } from "@/lib/sql/limits";
import type { SubmitResponse } from "@/lib/submissions/types";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Grading boots a WASM Postgres per test case; a cold function can take several seconds.
export const maxDuration = 60;

/** Per-user submission budget. Grading is the expensive part of this app, so cap it. */
const RATE_LIMIT = { windowMs: 60_000, maxSubmissions: 6 };

const bodySchema = z.object({
  slug: z.string().min(1).max(100),
  query: z.string().max(LIMITS.maxQueryLength, "Query is too long."),
});

function reply(body: SubmitResponse, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

/**
 * Grade a submission against the problem's hidden test cases and record it.
 *
 * Nothing from the client is trusted: the user comes from the verified session, the problem and
 * its tests are loaded server-side, and the submission (with its status) is written here with the
 * service role. Clients have no write access to submissions at all (see the RLS migration).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return reply({ ok: false, error: "Sign in to submit." }, 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  }
  const { slug, query } = parsed.data;

  // Counted through the user's own client, so RLS scopes it to their submissions. Two requests
  // racing can both slip under the limit; that's acceptable for a soft abuse guard.
  const since = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();
  const { count, error: countError } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (countError) return reply({ ok: false, error: "Could not check your submission limit." }, 500);
  if ((count ?? 0) >= RATE_LIMIT.maxSubmissions) {
    return reply(
      { ok: false, error: "You're submitting too quickly. Try again in a minute, or use Run." },
      429,
      { "Retry-After": String(RATE_LIMIT.windowMs / 1000) },
    );
  }

  const problem = await getGradingData(slug);
  if (!problem) return reply({ ok: false, error: "Problem not found." }, 404);

  let result;
  try {
    result = await gradeSubmission({
      userSql: query,
      referenceSql: problem.referenceSql,
      schemaSql: problem.schemaSql,
      testCases: problem.testCases,
      orderMatters: problem.orderMatters,
    });
  } catch (err) {
    if (err instanceof GradingError) {
      // Broken test data or reference: our bug, not the user's. Don't record a submission.
      console.error(`[grader] ${slug}: ${err.message}`);
      return reply(
        { ok: false, error: "Grading failed on our side. Please try again later." },
        500,
      );
    }
    throw err;
  }

  const adminClient = await getAdminClient();
  const { data: submission, error: insertError } = await adminClient
    .from("submissions")
    .insert({
      user_id: userId,
      problem_id: problem.problemId,
      query,
      status: result.status,
      runtime_ms: result.runtimeMs,
      passed_cases: result.cases.filter((c) => c.status === "passed").length,
      total_cases: result.cases.length,
      error_message: result.error?.message ?? null,
    })
    .select("id, created_at")
    .single();
  if (insertError) {
    console.error(`[grader] failed to record submission: ${insertError.message}`);
    return reply({ ok: false, error: "Could not save your submission." }, 500);
  }

  return reply({
    ok: true,
    submissionId: submission.id,
    createdAt: submission.created_at,
    ...result,
  });
}
