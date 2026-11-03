import "server-only";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/roles";
import { slugify, type AuthoredProblem } from "@/lib/problems/authoring";
import { isTag } from "@/lib/problems/tags";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

/*
 * Admin reads use the service role, because drafts and hidden data aren't visible through RLS.
 * Each function checks the caller itself. Deliberately not cached: admins must see their own edits.
 */

const namedSqlListSchema = z.array(z.object({ name: z.string(), sql: z.string() }));

/** Stored JSON is validated at the boundary rather than trusted. */
const parseNamedSql = (value: unknown) => {
  const parsed = namedSqlListSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

export type AdminProblemRow = Pick<
  Tables<"problems">,
  "id" | "number" | "slug" | "title" | "difficulty" | "is_published" | "updated_at"
>;

export async function getAdminProblems(): Promise<AdminProblemRow[]> {
  await requireAdmin();
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient
    .from("problems")
    .select("id, number, slug, title, difficulty, is_published, updated_at")
    .order("number");
  if (error) throw new Error(`Failed to load problems: ${error.message}`);
  return data;
}

export async function getPendingProposalCount(): Promise<number> {
  await requireAdmin();
  const adminClient = await getAdminClient();
  const { count, error } = await adminClient
    .from("problem_proposals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(`Failed to count proposals: ${error.message}`);
  return count ?? 0;
}

export interface QueuedProposal {
  id: string;
  title: string;
  difficulty: Tables<"problem_proposals">["difficulty"];
  tags: string[];
  descriptionMd: string;
  schemaSql: string | null;
  sampleDataSql: string | null;
  solutionSql: string | null;
  cases: { name: string; sql: string }[];
  createdAt: string;
  proposer: string | null;
  /** The draft an admin already started from this proposal, if any. */
  problemId: string | null;
}

/** Pending proposals, oldest first. */
export async function getProposalQueue(): Promise<QueuedProposal[]> {
  await requireAdmin();
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient
    .from("problem_proposals")
    .select(
      "id, title, difficulty, tags, description_md, schema_sql, sample_data_sql, solution_sql, cases, created_at, problem_id, proposer:profiles!problem_proposals_user_id_fkey(display_name)",
    )
    .eq("status", "pending")
    .order("created_at");
  if (error) throw new Error(`Failed to load proposals: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    tags: row.tags,
    descriptionMd: row.description_md,
    schemaSql: row.schema_sql,
    sampleDataSql: row.sample_data_sql,
    solutionSql: row.solution_sql,
    cases: parseNamedSql(row.cases),
    createdAt: row.created_at,
    proposer: row.proposer.display_name,
    problemId: row.problem_id,
  }));
}

export interface EditableProblem {
  id: string;
  number: number;
  isPublished: boolean;
  values: AuthoredProblem;
}

/** A problem with its hidden parts, as the editor's form values. Null if it doesn't exist. */
export async function getEditableProblem(id: string): Promise<EditableProblem | null> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return null;

  const adminClient = await getAdminClient();
  const { data: problem, error } = await adminClient
    .from("problems")
    .select("*, problem_solutions(reference_sql, pitfalls)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load problem: ${error.message}`);
  if (!problem) return null;

  const { data: cases, error: casesError } = await adminClient
    .from("test_cases")
    .select("name, data_sql")
    .eq("problem_id", id)
    .order("position");
  if (casesError) throw new Error(`Failed to load test cases: ${casesError.message}`);

  return {
    id: problem.id,
    number: problem.number,
    isPublished: problem.is_published,
    values: {
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      tags: problem.tags.filter(isTag),
      orderMatters: problem.order_matters,
      descriptionMd: problem.description_md,
      schemaSql: problem.schema_sql,
      sampleDataSql: problem.sample_data_sql,
      solutionSql: problem.problem_solutions?.reference_sql ?? "",
      cases: cases.map((c) => ({ name: c.name, sql: c.data_sql })),
      pitfalls: parseNamedSql(problem.problem_solutions?.pitfalls),
    },
  };
}

/** Editor values prefilled from a pending proposal. Null if it isn't open any more. */
export async function getProposalAsProblem(id: string): Promise<AuthoredProblem | null> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return null;

  const adminClient = await getAdminClient();
  const { data, error } = await adminClient
    .from("problem_proposals")
    .select(
      "title, difficulty, tags, description_md, schema_sql, sample_data_sql, solution_sql, cases",
    )
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw new Error(`Failed to load proposal: ${error.message}`);
  if (!data) return null;

  return {
    title: data.title,
    slug: slugify(data.title),
    difficulty: data.difficulty,
    tags: data.tags.filter(isTag),
    orderMatters: false,
    descriptionMd: data.description_md,
    schemaSql: data.schema_sql ?? "",
    sampleDataSql: data.sample_data_sql ?? "",
    solutionSql: data.solution_sql ?? "",
    cases: parseNamedSql(data.cases),
    pitfalls: [],
  };
}
