/**
 * Validation for problems written on the site: user proposals and the admin editor. Pure, so
 * forms, server code and tests all share it. Limits are also enforced by the database where a
 * column is written from user input (see the proposals migration).
 */
import { z } from "zod";

import { checkUserQuery } from "@/lib/sql/guard";
import { LIMITS } from "@/lib/sql/limits";
import { Constants } from "@/types/database";

import { TAG_IDS } from "./tags";

export const AUTHORING_LIMITS = {
  title: 120,
  slug: 80,
  description: 20_000,
  /** Schema, sample data, or one test case's data. */
  setupSql: 20_000,
  query: LIMITS.maxQueryLength,
  name: 120,
  minCases: 2,
  maxCases: 5,
  maxPitfalls: 5,
  reviewNote: 2_000,
} as const;

const L = AUTHORING_LIMITS;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Turn a title into a URL-safe slug that satisfies the problems.slug check constraint. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // the accents NFKD just split off: "è" becomes "e", not "e-"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, L.slug)
    .replace(/-+$/, "");
}

const title = z
  .string()
  .trim()
  .min(1, "Enter a title.")
  .max(L.title, `Keep the title under ${L.title} characters.`);
const difficulty = z.enum(Constants.public.Enums.difficulty);
const tags = z.array(z.enum(TAG_IDS));
const description = z
  .string()
  .max(L.description, `Keep the description under ${L.description} characters.`);
const setupSql = (label: string) =>
  z.string().max(L.setupSql, `${label} is too long (the limit is ${L.setupSql} characters).`);
const query = (label: string) =>
  z.string().max(L.query, `${label} is too long (the limit is ${L.query} characters).`);

const namedSql = (label: string, sql: z.ZodString) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, `Give every ${label} a name.`)
      .max(L.name, `Keep ${label} names under ${L.name} characters.`),
    sql,
  });

const testCases = z
  .array(namedSql("test case", setupSql("Test case data")))
  .max(L.maxCases, `Use at most ${L.maxCases} test cases.`);

/** A user's suggestion. Only the idea is required; an admin fills in the rest. */
export const proposalSchema = z.object({
  title,
  difficulty,
  tags,
  descriptionMd: description.refine((value) => value.trim() !== "", "Describe the problem."),
  schemaSql: setupSql("The schema"),
  sampleDataSql: setupSql("The sample data"),
  solutionSql: query("The solution"),
  cases: testCases,
});

export type ProposalInput = z.input<typeof proposalSchema>;

/** The admin editor's fields. A draft only has to fit this; publishing has further rules. */
export const authoredProblemSchema = z.object({
  title,
  slug: z
    .string()
    .max(L.slug, `Keep the URL under ${L.slug} characters.`)
    .regex(SLUG_PATTERN, "The URL can only use lowercase letters, numbers and single hyphens."),
  difficulty,
  tags,
  orderMatters: z.boolean(),
  descriptionMd: description,
  schemaSql: setupSql("The schema"),
  sampleDataSql: setupSql("The sample data"),
  solutionSql: query("The solution"),
  cases: testCases,
  pitfalls: z
    .array(namedSql("pitfall", query("A pitfall")))
    .max(L.maxPitfalls, `Use at most ${L.maxPitfalls} pitfalls.`),
});

export type AuthoredProblem = z.output<typeof authoredProblemSchema>;

export const EMPTY_PROBLEM: AuthoredProblem = {
  title: "",
  slug: "",
  difficulty: "easy",
  tags: [],
  orderMatters: false,
  descriptionMd: "",
  schemaSql: "",
  sampleDataSql: "",
  solutionSql: "",
  cases: [],
  pitfalls: [],
};

const isBlank = (value: string) => value.trim() === "";

/**
 * The publish rules that don't need the sandbox, so obvious gaps are reported straight away.
 * Returns one message per failed rule.
 */
export function checkProblemShape(
  problem: Pick<
    AuthoredProblem,
    "tags" | "descriptionMd" | "schemaSql" | "sampleDataSql" | "solutionSql" | "orderMatters"
  > & { cases: unknown[] },
): string[] {
  const issues: string[] = [];
  if (problem.tags.length === 0) issues.push("Add at least one topic tag.");
  if (isBlank(problem.descriptionMd)) issues.push("Write a description.");
  if (isBlank(problem.schemaSql)) issues.push("Write the schema.");
  if (isBlank(problem.sampleDataSql)) issues.push("Write the sample data.");

  const guard = checkUserQuery(problem.solutionSql);
  if (!guard.ok) issues.push(`Reference solution: ${guard.message}`);
  if (problem.orderMatters && !/\border\s+by\b/i.test(problem.solutionSql)) {
    issues.push("Row order matters here, so the reference solution needs an ORDER BY.");
  }

  if (problem.cases.length < L.minCases || problem.cases.length > L.maxCases) {
    issues.push(`Add ${L.minCases} to ${L.maxCases} hidden test cases.`);
  }
  return issues;
}
