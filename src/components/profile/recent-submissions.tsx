import Link from "next/link";

import type { RecentSubmission } from "@/lib/data/profile";
import { STATUS_COLOR, STATUS_LABEL, timeAgo } from "@/lib/submissions/status";

export function RecentSubmissions({ submissions }: { submissions: RecentSubmission[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recent submissions</h2>
      {submissions.length === 0 ? (
        <p className="text-muted text-sm">
          No submissions yet.{" "}
          <Link href="/problems" className="text-accent hover:underline">
            Pick a problem
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted text-xs tracking-wide uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Problem
                </th>
                <th scope="col" className="px-4 py-3">
                  Result
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                  Runtime
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/problems/${s.problem.slug}`}
                      className="hover:text-accent transition-colors"
                    >
                      <span className="text-muted mr-1.5 tabular-nums">{s.problem.number}.</span>
                      {s.problem.title}
                    </Link>
                  </td>
                  <td
                    className={`px-4 py-3 font-medium whitespace-nowrap ${STATUS_COLOR[s.status]}`}
                  >
                    {STATUS_LABEL[s.status]}
                    <span className="text-muted ml-2 text-xs font-normal tabular-nums">
                      {s.passed_cases}/{s.total_cases}
                    </span>
                  </td>
                  <td className="text-muted hidden px-4 py-3 tabular-nums sm:table-cell">
                    {s.runtime_ms !== null ? `${s.runtime_ms} ms` : "—"}
                  </td>
                  <td className="text-muted px-4 py-3 text-right text-xs whitespace-nowrap">
                    {timeAgo(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
