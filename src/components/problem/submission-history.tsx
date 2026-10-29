"use client";

import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { STATUS_COLOR, STATUS_LABEL, timeAgo } from "@/lib/submissions/status";
import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database";

import { useProblemSession } from "./problem-session";

type SubmissionRow = Pick<
  Tables<"submissions">,
  | "id"
  | "status"
  | "runtime_ms"
  | "passed_cases"
  | "total_cases"
  | "query"
  | "error_message"
  | "created_at"
>;

type LoadState =
  | { type: "loading" }
  | { type: "loaded"; rows: SubmissionRow[] }
  | { type: "error"; message: string };

/** The signed-in user's submissions for this problem, newest first. RLS limits rows to their own. */
export function SubmissionHistory({ slug }: { slug: string }) {
  const { user, submissionsVersion, openInEditor } = useProblemSession();
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createClient()
      .from("submissions")
      .select(
        "id, status, runtime_ms, passed_cases, total_cases, query, error_message, created_at, problems!inner(slug)",
      )
      .eq("problems.slug", slug)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(
          error ? { type: "error", message: error.message } : { type: "loaded", rows: data },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user, slug, submissionsVersion]);

  if (user === null) {
    return (
      <p className="text-muted text-sm">
        <Link
          href={`/login?next=${encodeURIComponent(`/problems/${slug}`)}`}
          className="text-accent hover:underline"
        >
          Sign in
        </Link>{" "}
        to submit solutions and keep a history of your attempts.
      </p>
    );
  }
  if (user === undefined || state.type === "loading") {
    return <Loader2 className="text-muted size-4 animate-spin" aria-label="Loading submissions" />;
  }
  if (state.type === "error") {
    return <p className="text-hard text-sm">Could not load submissions: {state.message}</p>;
  }
  if (state.rows.length === 0) {
    return <p className="text-muted text-sm">No submissions yet. Submit a query to see it here.</p>;
  }

  return (
    <ul className="divide-border border-border divide-y rounded-md border text-sm">
      {state.rows.map((row) => {
        const open = expanded === row.id;
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setExpanded(open ? null : row.id)}
              className="hover:bg-surface flex w-full items-center gap-3 px-3 py-2 text-left"
            >
              {open ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <span className={`w-36 shrink-0 font-medium ${STATUS_COLOR[row.status]}`}>
                {STATUS_LABEL[row.status]}
              </span>
              <span className="text-muted hidden tabular-nums sm:inline">
                {row.passed_cases}/{row.total_cases} cases
              </span>
              <span className="text-muted tabular-nums">
                {row.runtime_ms !== null ? `${row.runtime_ms} ms` : ""}
              </span>
              <span className="text-muted ml-auto text-xs whitespace-nowrap">
                {timeAgo(row.created_at)}
              </span>
            </button>
            {open && (
              <div className="flex flex-col gap-2 px-3 pb-3">
                {row.error_message && (
                  <p className="text-hard font-mono text-xs">{row.error_message}</p>
                )}
                <pre className="bg-surface border-border overflow-auto rounded-md border p-3 font-mono text-xs">
                  {row.query}
                </pre>
                <button
                  type="button"
                  onClick={() => openInEditor(row.query)}
                  className="text-accent w-fit text-xs hover:underline"
                >
                  Open in editor
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
