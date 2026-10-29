"use client";

import { Loader2, Play, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SampleTable } from "@/lib/problems/preview";
import type { RunOutcome, SandboxStatus } from "@/lib/sandbox/browser-sandbox";
import type { RawResult } from "@/lib/sql/types";
import type { SubmitResponse } from "@/lib/submissions/types";

import { useProblemSession } from "./problem-session";
import { ResultsPanel, type LastSubmission } from "./results-panel";
import { useSandbox } from "./use-sandbox";

// Monaco touches `window` and is large; load it only in the browser.
const SqlEditor = dynamic(() => import("./sql-editor"), {
  ssr: false,
  loading: () => <div className="text-muted p-4 text-sm">Loading editor…</div>,
});

interface ProblemWorkspaceProps {
  slug: string;
  setupSql: string;
  orderMatters: boolean;
  sampleExpected: RawResult | null;
  tables: SampleTable[];
}

const draftKey = (slug: string) => `sql-practice:draft:${slug}`;

function readDraft(slug: string): string | null {
  try {
    return localStorage.getItem(draftKey(slug));
  } catch {
    return null; // storage can be unavailable (private mode, blocked cookies)
  }
}

function writeDraft(slug: string, sql: string) {
  try {
    localStorage.setItem(draftKey(slug), sql);
  } catch {
    // Not worth surfacing: the draft just won't persist.
  }
}

export function ProblemWorkspace({
  slug,
  setupSql,
  orderMatters,
  sampleExpected,
  tables,
}: ProblemWorkspaceProps) {
  const { status, run } = useSandbox(setupSql);
  // Restore the user's draft. On the server there's no localStorage, so this yields the starter;
  // that can't cause a hydration mismatch because the editor only renders in the browser.
  const [sql, setSql] = useState(() => {
    const starter = tables[0] ? `SELECT *\nFROM ${tables[0].name};\n` : "SELECT 1;\n";
    return (typeof window !== "undefined" && readDraft(slug)) || starter;
  });
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [ranSql, setRanSql] = useState("");
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<LastSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focus, setFocus] = useState<"output" | "submission">("output");
  const [resultVersion, setResultVersion] = useState(0);
  const { user, notifySubmitted, registerEditor } = useProblemSession();

  // Let the submission history load a past query into this editor.
  useEffect(() => {
    registerEditor(setSql);
    return () => registerEditor(null);
  }, [registerEditor]);

  // Save drafts shortly after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(() => writeDraft(slug, sql), 300);
    return () => clearTimeout(timer);
  }, [slug, sql]);

  // Ctrl/Cmd+Enter fires from inside Monaco; read the latest text through a ref.
  const sqlRef = useRef(sql);
  useEffect(() => {
    sqlRef.current = sql;
  }, [sql]);

  const handleRun = useCallback(async () => {
    const query = sqlRef.current;
    if (running) return;
    setRunning(true);
    setRanSql(query);
    setOutcome(await run(query));
    setFocus("output");
    setResultVersion((v) => v + 1);
    setRunning(false);
  }, [run, running]);

  const handleSubmit = async () => {
    const query = sqlRef.current;
    if (submitting) return;
    setSubmitting(true);
    let response: SubmitResponse;
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, query }),
      });
      response = (await res.json()) as SubmitResponse;
    } catch {
      response = { ok: false, error: "Could not reach the server. Check your connection." };
    }
    setSubmission({ response, query });
    setFocus("submission");
    setResultVersion((v) => v + 1);
    setSubmitting(false);
    if (response.ok) notifySubmitted();
  };

  // Underline the error from whichever action the user just took.
  const editorError =
    focus === "submission"
      ? submission?.response.ok && submission.response.error
        ? submission.response.error
        : null
      : outcome?.type === "error"
        ? outcome
        : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center gap-3 border-b px-3 py-2">
        <SandboxIndicator status={status} />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            title="Run on the sample data (Ctrl/Cmd + Enter)"
            className="border-border bg-surface-raised hover:bg-surface inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run
          </button>
          {user === null ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/problems/${slug}`)}`}
              className="bg-accent text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Sign in to submit
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={user === undefined || submitting}
              title="Grade against the hidden test cases"
              className="bg-accent text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "Grading…" : "Submit"}
            </button>
          )}
        </div>
      </div>

      <div className="h-80 shrink-0 lg:h-auto lg:min-h-0 lg:flex-[3]">
        <SqlEditor
          value={sql}
          onChange={setSql}
          onRun={handleRun}
          tables={tables}
          error={editorError}
        />
      </div>

      <div className="border-border flex min-h-64 flex-col border-t lg:min-h-0 lg:flex-[2]">
        <ResultsPanel
          slug={slug}
          outcome={outcome}
          ranSql={ranSql}
          submission={submission}
          focus={focus}
          resultVersion={resultVersion}
          sampleExpected={sampleExpected}
          orderMatters={orderMatters}
        />
      </div>
    </div>
  );
}

const STATUS_TEXT: Record<SandboxStatus, string> = {
  idle: "Postgres stopped",
  booting: "Starting Postgres…",
  ready: "Postgres ready",
  running: "Running…",
  failed: "Postgres failed to start",
};

const STATUS_DOT: Record<SandboxStatus, string> = {
  idle: "bg-muted",
  booting: "bg-medium animate-pulse",
  ready: "bg-easy",
  running: "bg-medium animate-pulse",
  failed: "bg-hard",
};

function SandboxIndicator({ status }: { status: SandboxStatus }) {
  return (
    <span className="text-muted inline-flex items-center gap-2 text-xs" aria-live="polite">
      <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {STATUS_TEXT[status]}
      <span className="hidden sm:inline">· in your browser</span>
    </span>
  );
}
