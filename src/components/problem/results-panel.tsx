import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { RunOutcome } from "@/lib/sandbox/browser-sandbox";
import { compareResults } from "@/lib/sql/compare";
import { LIMITS } from "@/lib/sql/limits";
import { positionToLineColumn } from "@/lib/sql/position";
import type { RawResult } from "@/lib/sql/types";
import type { SubmitResponse } from "@/lib/submissions/types";

import { PanelTabs, type PanelTab } from "./panel-tabs";
import { ResultTable } from "./result-table";
import { SubmissionResult } from "./submission-result";

export interface LastSubmission {
  response: SubmitResponse;
  query: string;
}

interface ResultsPanelProps {
  slug: string;
  outcome: RunOutcome | null;
  /** The query that produced `outcome`, for turning an error position into line:column. */
  ranSql: string;
  submission: LastSubmission | null;
  /** Which tab the latest action should reveal. */
  focus: "output" | "submission";
  /** Incremented on every new result, so the panel re-selects `focus` each time. */
  resultVersion: number;
  sampleExpected: RawResult | null;
  orderMatters: boolean;
}

const rows = (n: number) => `${n} row${n === 1 ? "" : "s"}`;

export function ResultsPanel({
  slug,
  outcome,
  ranSql,
  submission,
  focus,
  resultVersion,
  sampleExpected,
  orderMatters,
}: ResultsPanelProps) {
  const tabs: PanelTab[] = [
    {
      id: "output",
      label: "Output",
      content: (
        <RunOutput
          outcome={outcome}
          ranSql={ranSql}
          sampleExpected={sampleExpected}
          orderMatters={orderMatters}
        />
      ),
    },
  ];
  if (sampleExpected) {
    tabs.push({
      id: "expected",
      label: "Expected",
      content: <ResultTable result={sampleExpected} />,
    });
  }
  if (submission) {
    tabs.push({
      id: "submission",
      label: "Submission",
      content: (
        <SubmissionResult response={submission.response} query={submission.query} slug={slug} />
      ),
    });
  }

  // Remounting on each new result (via key) re-selects the tab the user just acted on.
  return <PanelTabs key={resultVersion} label="Results" tabs={tabs} initialId={focus} />;
}

function RunOutput({
  outcome,
  ranSql,
  sampleExpected,
  orderMatters,
}: Pick<ResultsPanelProps, "outcome" | "ranSql" | "sampleExpected" | "orderMatters">) {
  if (!outcome) {
    return (
      <p className="text-muted text-sm">
        Run your query to see its output on the sample data. Submit checks it against hidden test
        cases with different data.
      </p>
    );
  }

  if (outcome.type === "timeout") {
    return (
      <Notice tone="warning" icon={<Clock className="size-4" />} title="Time limit exceeded">
        The query ran for more than {LIMITS.queryTimeoutMs / 1000} seconds and was stopped. Look for
        an accidental cross join or a huge generate_series.
      </Notice>
    );
  }

  if (outcome.type === "error") {
    const where =
      outcome.position !== undefined ? positionToLineColumn(ranSql, outcome.position) : null;
    return (
      <Notice tone="error" icon={<XCircle className="size-4" />} title="Error">
        <span className="font-mono">{outcome.message}</span>
        {where && (
          <span className="text-muted block text-xs">
            Line {where.line}, column {where.column}
          </span>
        )}
      </Notice>
    );
  }

  const comparison =
    sampleExpected && compareResults(sampleExpected, outcome.result, { orderMatters });
  return (
    <div className="flex flex-col gap-3">
      {comparison &&
        (comparison.equal ? (
          <Notice
            tone="success"
            icon={<CheckCircle2 className="size-4" />}
            title="Matches the expected output"
          >
            Your output is correct for the sample data. Submit to check it against the hidden test
            cases.
          </Notice>
        ) : (
          <Notice
            tone="warning"
            icon={<AlertTriangle className="size-4" />}
            title="Differs from the expected output"
          >
            {comparison.message}
          </Notice>
        ))}
      <p className="text-muted text-xs">
        {rows(outcome.result.rows.length)} · {outcome.runtimeMs} ms
      </p>
      <ResultTable result={outcome.result} />
    </div>
  );
}

const TONES = {
  success: "border-easy/40 bg-easy/10 text-easy",
  warning: "border-medium/40 bg-medium/10 text-medium",
  error: "border-hard/40 bg-hard/10 text-hard",
} as const;

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div role="status" className={`flex gap-3 rounded-md border p-3 text-sm ${TONES[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <div className="text-foreground/90">{children}</div>
      </div>
    </div>
  );
}
