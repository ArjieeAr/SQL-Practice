import "server-only";

import type { TestCaseInput } from "@/lib/grader/grade";
import { getAdminClient } from "@/lib/supabase/admin";

export interface GradingData {
  problemId: string;
  schemaSql: string;
  referenceSql: string;
  orderMatters: boolean;
  testCases: TestCaseInput[];
}

/**
 * Everything needed to grade a submission, including the hidden parts (reference solution and
 * test cases). Uses the service role because clients have no access to those tables at all.
 * Deliberately not cached: the data is secret and the queries are cheap.
 */
export async function getGradingData(slug: string): Promise<GradingData | null> {
  const adminClient = await getAdminClient();
  const { data: problem, error } = await adminClient
    .from("problems")
    .select("id, schema_sql, order_matters, problem_solutions(reference_sql)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load problem "${slug}": ${error.message}`);
  if (!problem?.problem_solutions) return null;

  const { data: cases, error: casesError } = await adminClient
    .from("test_cases")
    .select("name, data_sql")
    .eq("problem_id", problem.id)
    .order("position");
  if (casesError) throw new Error(`Failed to load test cases: ${casesError.message}`);

  return {
    problemId: problem.id,
    schemaSql: problem.schema_sql,
    referenceSql: problem.problem_solutions.reference_sql,
    orderMatters: problem.order_matters,
    testCases: cases.map((c) => ({ name: c.name, dataSql: c.data_sql })),
  };
}
