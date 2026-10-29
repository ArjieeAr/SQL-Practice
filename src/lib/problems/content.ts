/**
 * Loads problem definitions from content/problems. Node-only (reads the filesystem); used by
 * the seed script and the content integrity test, never shipped to the browser.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { Constants } from "@/types/database";

import { TAG_IDS } from "./tags";

export const CONTENT_DIR = path.join(process.cwd(), "content", "problems");

const metaSchema = z.strictObject({
  number: z.number().int().positive(),
  title: z.string().min(1),
  difficulty: z.enum(Constants.public.Enums.difficulty),
  tags: z.array(z.enum(TAG_IDS)).min(1),
  orderMatters: z.boolean(),
  published: z.boolean().default(true),
});

export type ProblemMeta = z.infer<typeof metaSchema>;

/** A named SQL file: a hidden test case's data, or a known-wrong query. */
export interface NamedSql {
  /** From the file's first line, `-- <name>`. Test case names are shown to users. */
  name: string;
  file: string;
  sql: string;
}

export interface ProblemDefinition extends ProblemMeta {
  slug: string;
  descriptionMd: string;
  schemaSql: string;
  sampleDataSql: string;
  solutionSql: string;
  cases: NamedSql[];
  /** Common wrong answers. The integrity test checks the hidden cases reject every one. */
  pitfalls: NamedSql[];
}

const read = (...parts: string[]) => readFile(path.join(...parts), "utf8");

async function readNamedSql(dir: string): Promise<NamedSql[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return [];
  }
  return Promise.all(
    files.map(async (file) => {
      const sql = await read(dir, file);
      const name = /^--\s*(.+)/.exec(sql)?.[1]?.trim();
      if (!name) throw new Error(`${path.join(dir, file)} must start with a "-- <name>" comment`);
      return { name, file, sql };
    }),
  );
}

export async function loadProblem(slug: string, dir = CONTENT_DIR): Promise<ProblemDefinition> {
  const root = path.join(dir, slug);
  const parsed = metaSchema.safeParse(JSON.parse(await read(root, "meta.json")));
  if (!parsed.success) {
    throw new Error(`${slug}/meta.json is invalid:\n${z.prettifyError(parsed.error)}`);
  }

  const [descriptionMd, schemaSql, sampleDataSql, solutionSql, cases, pitfalls] = await Promise.all(
    [
      read(root, "problem.md"),
      read(root, "schema.sql"),
      read(root, "sample.sql"),
      read(root, "solution.sql"),
      readNamedSql(path.join(root, "cases")),
      readNamedSql(path.join(root, "pitfalls")),
    ],
  );

  return {
    slug,
    ...parsed.data,
    descriptionMd,
    schemaSql,
    sampleDataSql,
    solutionSql,
    cases,
    pitfalls,
  };
}

/** Every problem under `dir`, sorted by number. */
export async function loadProblems(dir = CONTENT_DIR): Promise<ProblemDefinition[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const problems = await Promise.all(slugs.map((slug) => loadProblem(slug, dir)));
  return problems.sort((a, b) => a.number - b.number);
}
