import type { GradeResult } from "@/lib/grader/grade";

/** Response body of POST /api/submit. */
export type SubmitResponse =
  | ({ ok: true; submissionId: string; createdAt: string } & GradeResult)
  | { ok: false; error: string };
