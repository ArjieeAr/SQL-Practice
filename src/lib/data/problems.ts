import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { rawResultSchema, sampleTablesSchema, type SampleTable } from "@/lib/problems/preview";
import type { RawResult } from "@/lib/sql/types";
import { publicClient } from "@/lib/supabase/public";
import type { Tables } from "@/types/database";

export type ProblemSummary = Pick<
  Tables<"problems">,
  "number" | "slug" | "title" | "difficulty" | "tags"
>;

export interface ProblemDetail extends ProblemSummary {
  descriptionMd: string;
  schemaSql: string;
  sampleDataSql: string;
  orderMatters: boolean;
  /** Reference output on the sample data. Null until the seed script has computed it. */
  sampleExpected: RawResult | null;
  /** Sample tables for the schema viewer. Null until the seed script has computed them. */
  sampleTables: SampleTable[] | null;
}

/*
 * Problems are public and change only when the seed script runs, so they're cached for everyone
 * ("use cache") instead of being fetched per request. The `problems` tag lets a future admin
 * action revalidate them on demand.
 */

export async function getProblemSummaries(): Promise<ProblemSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("problems");

  const { data, error } = await publicClient
    .from("problems")
    .select("number, slug, title, difficulty, tags")
    .order("number");
  if (error) throw new Error(`Failed to load problems: ${error.message}`);
  return data;
}

export async function getProblem(slug: string): Promise<ProblemDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("problems", `problem:${slug}`);

  // select("*") rather than a column list: sample_tables may not exist yet on an older database.
  const { data, error } = await publicClient
    .from("problems")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load problem "${slug}": ${error.message}`);
  if (!data) return null;

  // JSON columns are validated at the boundary rather than trusted as `any`.
  const expected = rawResultSchema.safeParse(data.sample_expected);
  const tables = sampleTablesSchema.safeParse(data.sample_tables);

  return {
    number: data.number,
    slug: data.slug,
    title: data.title,
    difficulty: data.difficulty,
    tags: data.tags,
    descriptionMd: data.description_md,
    schemaSql: data.schema_sql,
    sampleDataSql: data.sample_data_sql,
    orderMatters: data.order_matters,
    sampleExpected: expected.success ? expected.data : null,
    sampleTables: tables.success ? tables.data : null,
  };
}
