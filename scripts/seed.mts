/**
 * Upload content/problems to Supabase.
 *
 *   npm run seed          verify every problem, then upload (needs .env.local)
 *   npm run seed:check    verify only: no network, no credentials
 *
 * Every problem is verified in the sandbox first, and nothing is written unless all of them
 * pass, so a broken reference solution can never reach the database. Re-running is safe:
 * problems are upserted by slug, test cases are replaced, and problems removed from content/
 * are unpublished rather than deleted (users' submissions still point at them).
 */
import { createClient } from "@supabase/supabase-js";

import { loadProblems, type ProblemDefinition } from "@/lib/problems/content";
import { verifyProblem, type ProblemVerification } from "@/lib/problems/verify";
import { createSnapshot } from "@/lib/sandbox/engine.mjs";
import type { Database, Json } from "@/types/database";

const dryRun = process.argv.includes("--dry-run");

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

// 1. Verify everything before touching the database.
const problems = await loadProblems();
const snapshot = await createSnapshot();
const verified: { problem: ProblemDefinition; verification: ProblemVerification }[] = [];

for (const problem of problems) {
  const verification = await verifyProblem(problem, snapshot).catch((err: Error) =>
    fail(err.message),
  );
  const uncaught = verification.pitfalls.filter((p) => p.caughtBy === null);
  if (uncaught.length > 0) {
    fail(
      `${problem.slug}: no hidden case rejects pitfall(s): ${uncaught.map((p) => p.name).join("; ")}`,
    );
  }
  verified.push({ problem, verification });
  console.log(
    `✓ ${String(problem.number).padStart(2)}. ${problem.title} ` +
      `(${problem.difficulty}, ${problem.cases.length} cases, ${problem.pitfalls.length} pitfalls)`,
  );
}

if (dryRun) {
  console.log(`\nAll ${problems.length} problems verified. Dry run: nothing uploaded.`);
  process.exit(0);
}

// 2. Upload with the secret key (bypasses RLS; this script is the only writer of problems).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
}
const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error: problemsError } = await supabase
  .from("problems")
  .upsert(
    verified.map(({ problem, verification }) => ({
      slug: problem.slug,
      number: problem.number,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      description_md: problem.descriptionMd,
      schema_sql: problem.schemaSql,
      sample_data_sql: problem.sampleDataSql,
      // RawResult is plain JSON data; the cast only bridges interface vs. index-signature types.
      sample_expected: verification.sampleExpected as unknown as Json,
      order_matters: problem.orderMatters,
      is_published: problem.published,
    })),
    { onConflict: "slug" },
  )
  .select("id, slug");
if (problemsError) fail(`Upserting problems failed: ${problemsError.message}`);

const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));
const problemId = (slug: string) => idBySlug.get(slug) ?? fail(`No id returned for ${slug}`);

const { error: solutionsError } = await supabase.from("problem_solutions").upsert(
  problems.map((p) => ({ problem_id: problemId(p.slug), reference_sql: p.solutionSql })),
  { onConflict: "problem_id" },
);
if (solutionsError) fail(`Upserting reference solutions failed: ${solutionsError.message}`);

// Replace test cases wholesale: simpler than diffing, and cases have no dependents.
const ids = problems.map((p) => problemId(p.slug));
const { error: deleteError } = await supabase.from("test_cases").delete().in("problem_id", ids);
if (deleteError) fail(`Clearing old test cases failed: ${deleteError.message}`);

const { error: casesError } = await supabase.from("test_cases").insert(
  problems.flatMap((p) =>
    p.cases.map((testCase, i) => ({
      problem_id: problemId(p.slug),
      position: i + 1,
      name: testCase.name,
      data_sql: testCase.sql,
    })),
  ),
);
if (casesError) fail(`Inserting test cases failed: ${casesError.message}`);

const { data: unpublished, error: unpublishError } = await supabase
  .from("problems")
  .update({ is_published: false })
  .not("slug", "in", `(${problems.map((p) => p.slug).join(",")})`)
  .eq("is_published", true)
  .select("slug");
if (unpublishError) fail(`Unpublishing removed problems failed: ${unpublishError.message}`);

console.log(
  `\nUploaded ${problems.length} problems and ${problems.reduce((n, p) => n + p.cases.length, 0)} test cases.` +
    (unpublished.length ? ` Unpublished: ${unpublished.map((r) => r.slug).join(", ")}.` : ""),
);
process.exit(0);
