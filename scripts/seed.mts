/**
 * Import the starter problem set from content/problems into Supabase.
 *
 *   npm run seed          verify every problem, then import (needs .env.local)
 *   npm run seed:check    verify only: no network, no credentials
 *
 * The database owns problems: admins edit them on the site. So this never overwrites or unpublishes
 * anything, and re-running it is safe. It only:
 * - inserts problems whose slug isn't in the database yet, and
 * - fills in pitfalls on existing problems that have none, which brings forward problems seeded
 *   before pitfalls were stored in the database.
 *
 * Every problem is verified in the sandbox first, and nothing is written unless all of them pass,
 * so a broken reference solution can never reach the database.
 */
import { createClient } from "@supabase/supabase-js";

import { loadProblems, type ProblemDefinition } from "@/lib/problems/content";
import { checkPublishRules, verifyProblem, type ProblemVerification } from "@/lib/problems/verify";
import type { Database, Json } from "@/types/database";

const dryRun = process.argv.includes("--dry-run");

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

const namedSqlJson = (items: { name: string; sql: string }[]) =>
  items.map(({ name, sql }) => ({ name, sql }));

// 1. Verify everything before touching the database.
const problems = await loadProblems();
const verified: { problem: ProblemDefinition; verification: ProblemVerification }[] = [];

for (const problem of problems) {
  const verification = await verifyProblem(problem).catch((err: Error) => fail(err.message));
  const issues = checkPublishRules(problem, verification);
  if (issues.length > 0) fail(`${problem.slug}: ${issues.join(" ")}`);
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

// 2. Import with the secret key (bypasses RLS).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
}
const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: existingError } = await supabase
  .from("problems")
  .select("id, slug, number, problem_solutions(pitfalls)");
if (existingError) fail(`Reading existing problems failed: ${existingError.message}`);

const existingBySlug = new Map(existing.map((row) => [row.slug, row]));
const takenNumbers = new Set(existing.map((row) => row.number));

let inserted = 0;
let backfilled = 0;

for (const { problem, verification } of verified) {
  const row = existingBySlug.get(problem.slug);

  if (row) {
    const stored = row.problem_solutions?.pitfalls;
    const storedNothing = Array.isArray(stored) && stored.length === 0;
    if (!storedNothing || problem.pitfalls.length === 0) continue;

    const { error } = await supabase
      .from("problem_solutions")
      .update({ pitfalls: namedSqlJson(problem.pitfalls) })
      .eq("problem_id", row.id);
    if (error) fail(`${problem.slug}: backfilling pitfalls failed: ${error.message}`);
    backfilled += 1;
    continue;
  }

  const { error } = await supabase.rpc("save_problem", {
    payload: {
      // An admin may have taken this number already: then save_problem uses the next free one.
      number: takenNumbers.has(problem.number) ? undefined : problem.number,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      description_md: problem.descriptionMd,
      schema_sql: problem.schemaSql,
      sample_data_sql: problem.sampleDataSql,
      order_matters: problem.orderMatters,
      is_published: problem.published,
      // RawResult is plain JSON data; the cast only bridges interface vs. index-signature types.
      sample_expected: verification.sampleExpected as unknown as Json,
      sample_tables: verification.sampleTables as unknown as Json,
      reference_sql: problem.solutionSql,
      pitfalls: namedSqlJson(problem.pitfalls),
      cases: namedSqlJson(problem.cases),
    },
  });
  if (error) fail(`${problem.slug}: importing failed: ${error.message}`);
  inserted += 1;
}

console.log(
  `\nImported ${inserted} new problems and backfilled pitfalls on ${backfilled}. ` +
    `Existing problems were otherwise left alone: edit them on the site.`,
);
process.exit(0);
