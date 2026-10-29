/** Guardrails for user-submitted SQL. Shared by the browser runner and the grader. */
export const LIMITS = {
  /** Max characters in a submitted query. */
  maxQueryLength: 5_000,
  /** Max rows fetched from a user query; anything beyond is reported as too large. */
  maxResultRows: 1_000,
  /** Wall-clock budget for running the reference + user query on one test case. */
  queryTimeoutMs: 3_000,
  /** Budget for booting PGlite and loading a test case's schema + data. */
  bootTimeoutMs: 20_000,
} as const;
