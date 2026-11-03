import type { AuthoredProblem } from "./authoring";
import type { ProblemVerification } from "./verify";

/** POST /api/admin/problems. Shared by the route and the editor. */
export type EditorIntent = "verify" | "draft" | "publish";

export interface EditorRequest {
  intent: EditorIntent;
  /** The problem being edited; absent when creating one. */
  problemId?: string;
  /** The proposal this problem is being created from. */
  proposalId?: string;
  problem: AuthoredProblem;
}

export type EditorResponse =
  | { ok: true; intent: "verify"; issues: string[]; verification: ProblemVerification }
  | { ok: true; intent: "draft" | "publish"; id: string; slug: string }
  | { ok: false; error: string; issues?: string[]; verification?: ProblemVerification };
