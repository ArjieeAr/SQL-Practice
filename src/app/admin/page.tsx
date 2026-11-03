import Link from "next/link";
import { Suspense } from "react";

import { unpublishProblem } from "@/app/admin/actions";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { requireAdminPage } from "@/lib/auth/roles";
import { getAdminProblems, getPendingProposalCount } from "@/lib/data/admin";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="bg-surface h-96 animate-pulse rounded-lg" aria-busy />}>
      <AdminProblems />
    </Suspense>
  );
}

async function AdminProblems() {
  await requireAdminPage("/admin");
  const [problems, pending] = await Promise.all([getAdminProblems(), getPendingProposalCount()]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">All problems</h1>
          <p className="text-muted text-sm">
            {pending > 0 ? (
              <Link href="/admin/proposals" className="text-accent hover:underline">
                {pending} {pending === 1 ? "proposal" : "proposals"} waiting for review
              </Link>
            ) : (
              "No proposals waiting for review."
            )}
          </p>
        </div>
        <Link
          href="/admin/problems/new"
          className="bg-accent text-accent-foreground inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          New problem
        </Link>
      </header>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Problem
              </th>
              <th scope="col" className="px-4 py-3">
                Difficulty
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {problems.map((problem) => (
              <tr key={problem.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/problems/${problem.id}`}
                    className="hover:text-accent transition-colors"
                  >
                    <span className="text-muted mr-1.5 tabular-nums">{problem.number}.</span>
                    {problem.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <DifficultyBadge difficulty={problem.difficulty} />
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap ${problem.is_published ? "text-easy" : "text-muted"}`}
                >
                  {problem.is_published ? "Published" : "Draft"}
                </td>
                <td className="px-4 py-3 text-right">
                  {problem.is_published && (
                    <form action={unpublishProblem.bind(null, problem.id)}>
                      <button
                        type="submit"
                        aria-label={`Unpublish ${problem.title}`}
                        className="text-muted hover:text-hard text-xs transition-colors"
                      >
                        Unpublish
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
