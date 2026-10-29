import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

import type { RunOutcome } from "@/lib/sandbox/browser-sandbox";
import { compareResults } from "@/lib/sql/compare";
import { LIMITS } from "@/lib/sql/limits";
import { positionToLineColumn } from "@/lib/sql/position";
import type { RawResult } from "@/lib/sql/types";

import { PanelTabs } from "./panel-tabs";
import { ResultTable } from "./result-table";

interface ResultsPanelProps {
  outcome: RunOutcome | null;
  /** The query that produced `outcome`, for turning an error position into line:column. */
  ranSql: string;
  sampleExpected: RawResult | null;
  orderMatters: boolean;
}

const rows = (n: number) => `${n} row${n === 1 ? "" : "s"}`;

export function ResultsPanel({ outcome, ranSql, sampleExpected, orderMatters }: ResultsPanelProps) {
  const expectedTab = sampleExpected && {
    id: "expected",
    label: "Expected",
    content: <ResultTable result={sampleExpected} />,
  };

  if (!outcome) {
    return (
      <PanelTabs
        label="Results"
        tabs={[
          {
            id: "output",
            label: "Output",
            content: (
              <p className="text-muted text-sm">
                Run your query to see its output on the sample data. Submit checks it against hidden
                test cases with different data.
              </p>
            ),
          },
          ...(expectedTab ? [expectedTab] : []),
        ]}
      />
    );
  }

  let content;
  if (outcome.type === "timeout") {
    content = (
      <Notice tone="warning" icon={<Clock className="size-4" />} title="Time limit exceeded">
        The query ran for more than {LIMITS.queryTimeoutMs / 1000} seconds and was stopped. Look for
        an accidental cross join or a huge generate_series.
      </Notice>
    );
  } else if (outcome.type === "error") {
    const where =
      outcome.position !== undefined ? positionToLineColumn(ranSql, outcome.position) : null;
    content = (
      <Notice tone="error" icon={<XCircle className="size-4" />} title="Error">
        <span className="font-mono">{outcome.message}</span>
        {where && (
          <span className="text-muted block text-xs">
            Line {where.line}, column {where.column}
          </span>
        )}
      </Notice>
    );
  } else {
    const comparison =
      sampleExpected && compareResults(sampleExpected, outcome.result, { orderMatters });
    content = (
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

  return (
    <PanelTabs
      label="Results"
      tabs={[{ id: "output", label: "Output", content }, ...(expectedTab ? [expectedTab] : [])]}
    />
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
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
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
