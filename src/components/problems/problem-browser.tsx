"use client";

import { CheckCircle2, CircleDashed, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  filterProblems,
  NO_FILTERS,
  type FilterableProblem,
  type ProblemFilters,
  type StatusFilter,
} from "@/lib/problems/filter";
import { TAG_IDS, TAGS, type Tag } from "@/lib/problems/tags";

import { DIFFICULTY_LABEL, DifficultyBadge } from "./difficulty-badge";

type ProblemStatus = "solved" | "attempted";

interface ProblemBrowserProps {
  problems: FilterableProblem[];
  /** Null while the signed-in user's progress is still streaming in (or for the static shell). */
  statuses: Record<string, ProblemStatus> | null;
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

export function ProblemBrowser({ problems, statuses }: ProblemBrowserProps) {
  const [filters, setFilters] = useState<ProblemFilters>(NO_FILTERS);
  const update = (patch: Partial<ProblemFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const solvedSlugs = useMemo(
    () =>
      new Set(
        Object.entries(statuses ?? {})
          .filter(([, status]) => status === "solved")
          .map(([slug]) => slug),
      ),
    [statuses],
  );
  const visible = filterProblems(problems, filters, solvedSlugs);
  const hasStatuses = statuses !== null && Object.keys(statuses).length > 0;
  const isFiltered =
    filters.query !== "" ||
    filters.difficulty !== "all" ||
    filters.tags.length > 0 ||
    filters.status !== "all";

  const toggleTag = (tag: Tag) =>
    update({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search problems</span>
          <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search by title or number"
            className="border-border bg-surface placeholder:text-muted focus:border-accent h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
          />
        </label>

        <div
          role="radiogroup"
          aria-label="Difficulty"
          className="border-border bg-surface flex h-10 rounded-md border p-1"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={filters.difficulty === d}
              onClick={() => update({ difficulty: d })}
              className={`rounded px-3 text-sm transition-colors ${
                filters.difficulty === d
                  ? "bg-surface-raised text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {d === "all" ? "All" : DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>

        {hasStatuses && (
          <select
            aria-label="Status"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value as StatusFilter })}
            className="border-border bg-surface h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">Any status</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Topics">
        {TAG_IDS.map((tag) => {
          const active = filters.tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {TAGS[tag]}
            </button>
          );
        })}
        {isFiltered && (
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className="text-muted hover:text-foreground inline-flex items-center gap-1 px-2 text-xs"
          >
            <X className="size-3" /> Clear filters
          </button>
        )}
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Status</span>
              </th>
              <th scope="col" className="px-2 py-3">
                Title
              </th>
              <th scope="col" className="hidden px-4 py-3 md:table-cell">
                Topics
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Difficulty
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {visible.map((problem) => (
              <tr key={problem.slug} className="hover:bg-surface/60 transition-colors">
                <td className="px-4 py-3">
                  <StatusIcon status={statuses?.[problem.slug]} />
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/problems/${problem.slug}`}
                    className="hover:text-accent font-medium transition-colors"
                  >
                    <span className="text-muted mr-2 tabular-nums">{problem.number}.</span>
                    {problem.title}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-surface text-muted rounded px-1.5 py-0.5 text-xs"
                      >
                        {TAGS[tag as Tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <DifficultyBadge difficulty={problem.difficulty} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-12 text-center">
                  No problems match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ProblemStatus | undefined }) {
  if (status === "solved") {
    return <CheckCircle2 className="text-easy size-4" aria-label="Solved" />;
  }
  if (status === "attempted") {
    return <CircleDashed className="text-medium size-4" aria-label="Attempted" />;
  }
  return null;
}
