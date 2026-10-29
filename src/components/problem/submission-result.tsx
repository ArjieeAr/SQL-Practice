import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

import type { CaseStatus } from "@/lib/grader/grade";
import { positionToLineColumn } from "@/lib/sql/position";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/submissions/status";
import type { SubmitResponse } from "@/lib/submissions/types";

interface SubmissionResultProps {
  response: SubmitResponse;
  /** The submitted query, for turning an error position into line:column. */
  query: string;
  slug: string;
}

export function SubmissionResult({ response, query, slug }: SubmissionResultProps) {
  if (!response.ok) {
    return (
      <div role="alert" className="border-hard/40 bg-hard/10 rounded-md border p-3 text-sm">
        <p className="text-hard font-medium">Submission failed</p>
        <p>{response.error}</p>
        {response.error.startsWith("Sign in") && (
          <Link
            href={`/login?next=${encodeURIComponent(`/problems/${slug}`)}`}
            className="text-accent text-sm hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const passed = response.cases.filter((c) => c.status === "passed").length;
  const failedIndex = response.cases.findIndex(
    (c) => c.status !== "passed" && c.status !== "skipped",
  );
  const failed = failedIndex >= 0 ? response.cases[failedIndex] : null;
  const where =
    response.error?.position !== undefined
      ? positionToLineColumn(query, response.error.position)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className={`text-lg font-semibold ${STATUS_COLOR[response.status]}`} role="status">
          {STATUS_LABEL[response.status]}
        </p>
        <p className="text-muted text-sm">
          {response.status === "accepted"
            ? `Passed all ${response.cases.length} hidden test cases · ${response.runtimeMs} ms`
            : `${passed} of ${response.cases.length} hidden test cases passed`}
        </p>
      </div>

      {failed && (
        <div className="border-border bg-surface flex flex-col gap-1 rounded-md border p-3 text-sm">
          <p className="font-medium">
            Test case {failedIndex + 1}: {failed.name}
          </p>
          {failed.message && <p className="font-mono text-xs">{failed.message}</p>}
          {where && (
            <p className="text-muted text-xs">
              Line {where.line}, column {where.column}
            </p>
          )}
        </div>
      )}

      <ol className="flex flex-col gap-1.5 text-sm">
        {response.cases.map((testCase, i) => (
          <li key={i} className="flex items-center gap-2">
            <CaseIcon status={testCase.status} />
            <span className="text-muted tabular-nums">Case {i + 1}</span>
            <span className={testCase.status === "skipped" ? "text-muted" : ""}>
              {testCase.name}
            </span>
          </li>
        ))}
      </ol>
      {response.status !== "accepted" && (
        <p className="text-muted text-xs">
          Hidden test data isn&apos;t shown, but the case names hint at the edge cases they cover.
        </p>
      )}
    </div>
  );
}

function CaseIcon({ status }: { status: CaseStatus }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="text-easy size-4 shrink-0" aria-label="passed" />;
    case "timeout":
      return <Clock className="text-medium size-4 shrink-0" aria-label="timed out" />;
    case "skipped":
      return <Circle className="text-muted size-4 shrink-0" aria-label="skipped" />;
    default:
      return <XCircle className="text-hard size-4 shrink-0" aria-label={status} />;
  }
}
