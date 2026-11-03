import type { Metadata } from "next";
import Link from "next/link";

import { ProblemBrowser } from "@/components/problems/problem-browser";
import { getProblemSummaries } from "@/lib/data/problems";
import { getMyProblemStatuses } from "@/lib/data/progress";

export const metadata: Metadata = {
  title: "Problems",
};

export default async function ProblemsPage() {
  // Cached and identical for everyone, so the full list ships in the prerendered HTML.
  const problems = await getProblemSummaries();
  // Not awaited: the visitor's solved/attempted marks depend on their cookies, so the promise
  // streams to the browser and only the parts that need it wait (see ProblemBrowser).
  const statusesPromise = getMyProblemStatuses();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="text-muted text-sm">
            {problems.length} problems on JOINs, aggregation, window functions, CTEs and more.
          </p>
        </div>
        <Link href="/proposals/new" className="text-accent text-sm hover:underline">
          Propose a problem
        </Link>
      </header>
      <ProblemBrowser problems={problems} statusesPromise={statusesPromise} />
    </section>
  );
}
