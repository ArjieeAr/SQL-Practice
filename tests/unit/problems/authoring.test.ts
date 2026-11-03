import { describe, expect, it } from "vitest";

import {
  AUTHORING_LIMITS,
  authoredProblemSchema,
  checkProblemShape,
  EMPTY_PROBLEM,
  proposalSchema,
  slugify,
  type AuthoredProblem,
} from "@/lib/problems/authoring";
import { checkPublishRules, type ProblemVerification } from "@/lib/problems/verify";

const complete: AuthoredProblem = {
  ...EMPTY_PROBLEM,
  title: "Top Earners",
  slug: "top-earners",
  tags: ["joins"],
  descriptionMd: "Find them.",
  schemaSql: "CREATE TABLE t (x int);",
  sampleDataSql: "INSERT INTO t VALUES (1);",
  solutionSql: "SELECT x FROM t",
  cases: [
    { name: "one", sql: "" },
    { name: "two", sql: "" },
  ],
};

describe("slugify", () => {
  it("makes a URL-safe slug from a title", () => {
    expect(slugify("Second Highest Salary")).toBe("second-highest-salary");
    expect(slugify("  What's   new? (2024) ")).toBe("what-s-new-2024");
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
  });

  it("returns a slug the schema accepts, or an empty one it rejects", () => {
    const check = (title: string) =>
      authoredProblemSchema.safeParse({ ...complete, slug: slugify(title) }).success;
    expect(check("Top Earners!")).toBe(true);
    expect(check("???")).toBe(false);
  });

  it("stays within the limit without ending in a hyphen", () => {
    const slug = slugify(`${"a".repeat(AUTHORING_LIMITS.slug - 1)} tail`);
    expect(slug.length).toBeLessThanOrEqual(AUTHORING_LIMITS.slug);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("proposalSchema", () => {
  const idea = {
    title: "An idea",
    difficulty: "easy",
    tags: [],
    descriptionMd: "Rank the things.",
    schemaSql: "",
    sampleDataSql: "",
    solutionSql: "",
    cases: [],
  };

  it("only needs an idea, not any SQL", () => {
    expect(proposalSchema.safeParse(idea).success).toBe(true);
  });

  it("requires a title and description", () => {
    expect(proposalSchema.safeParse({ ...idea, title: "  " }).success).toBe(false);
    expect(proposalSchema.safeParse({ ...idea, descriptionMd: " \n " }).success).toBe(false);
  });

  it("rejects unknown tags and oversized input", () => {
    expect(proposalSchema.safeParse({ ...idea, tags: ["made-up"] }).success).toBe(false);
    expect(
      proposalSchema.safeParse({
        ...idea,
        schemaSql: "x".repeat(AUTHORING_LIMITS.setupSql + 1),
      }).success,
    ).toBe(false);
    expect(
      proposalSchema.safeParse({
        ...idea,
        cases: Array.from({ length: AUTHORING_LIMITS.maxCases + 1 }, () => ({
          name: "c",
          sql: "",
        })),
      }).success,
    ).toBe(false);
  });
});

describe("authoredProblemSchema", () => {
  it("lets a draft be incomplete", () => {
    const draft = { ...EMPTY_PROBLEM, title: "Later", slug: "later" };
    expect(authoredProblemSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects slugs the database would reject", () => {
    for (const slug of ["", "Has-Caps", "double--hyphen", "-edge", "under_score"]) {
      expect(authoredProblemSchema.safeParse({ ...complete, slug }).success).toBe(false);
    }
  });
});

describe("checkProblemShape", () => {
  it("accepts a complete problem", () => {
    expect(checkProblemShape(complete)).toEqual([]);
  });

  it("lists everything that's missing from an empty problem", () => {
    expect(checkProblemShape(EMPTY_PROBLEM)).toEqual([
      "Add at least one topic tag.",
      "Write a description.",
      "Write the schema.",
      "Write the sample data.",
      "Reference solution: Write a query first.",
      "Add 2 to 5 hidden test cases.",
    ]);
  });

  it("requires a read query as the reference", () => {
    const issues = checkProblemShape({ ...complete, solutionSql: "DELETE FROM t" });
    expect(issues).toEqual([expect.stringMatching(/^Reference solution: Only read queries/)]);
  });

  it("requires ORDER BY when row order matters", () => {
    expect(checkProblemShape({ ...complete, orderMatters: true })).toEqual([
      expect.stringMatching(/needs an ORDER BY/),
    ]);
    expect(
      checkProblemShape({
        ...complete,
        orderMatters: true,
        solutionSql: "SELECT x FROM t ORDER\n BY x",
      }),
    ).toEqual([]);
  });

  it("enforces the number of test cases", () => {
    const withCases = (n: number) => ({
      ...complete,
      cases: Array.from({ length: n }, () => ({ name: "c", sql: "" })),
    });
    expect(checkProblemShape(withCases(1))).toHaveLength(1);
    expect(checkProblemShape(withCases(5))).toEqual([]);
    expect(checkProblemShape(withCases(6))).toHaveLength(1);
  });
});

describe("checkPublishRules", () => {
  const result = (rows: string[][]) => ({
    columns: [{ name: "x", typeId: 23 }],
    rows,
    truncated: false,
  });
  const verification: ProblemVerification = {
    sampleExpected: result([["1"]]),
    sampleTables: [{ name: "t", columns: [], rows: result([["1"]]) }],
    cases: [],
    pitfalls: [{ name: "caught", caughtBy: "one" }],
  };

  it("passes a verified, complete problem", () => {
    expect(checkPublishRules(complete, verification)).toEqual([]);
  });

  it("includes the rules that don't need the sandbox", () => {
    expect(checkPublishRules({ ...complete, tags: [] }, verification)).toEqual([
      "Add at least one topic tag.",
    ]);
  });

  it("requires rows on the sample data, so Run has something to show", () => {
    const issues = checkPublishRules(complete, { ...verification, sampleExpected: result([]) });
    expect(issues).toEqual([expect.stringMatching(/returns no rows/)]);
  });

  it("requires at least one table", () => {
    const issues = checkPublishRules(complete, { ...verification, sampleTables: [] });
    expect(issues).toEqual(["The schema doesn't create any tables."]);
  });

  it("requires every pitfall to be caught", () => {
    const issues = checkPublishRules(complete, {
      ...verification,
      pitfalls: [
        { name: "caught", caughtBy: "one" },
        { name: "slips through", caughtBy: null },
      ],
    });
    expect(issues).toEqual([`No hidden test case rejects the pitfall "slips through".`]);
  });
});
