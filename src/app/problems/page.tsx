import type { Metadata } from "next";
import { Suspense } from "react";

import { ProblemBrowser } from "@/components/problems/problem-browser";
import { getProblemSummaries, type ProblemSummary } from "@/lib/data/problems";
import { getMyProblemStatuses } from "@/lib/data/progress";

export const metadata: Metadata = {
  title: "Problems",
};

export default async function ProblemsPage() {
  // Cached and identical for everyone, so the full list ships in the prerendered HTML.
  const problems = await getProblemSummaries();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
        <p className="text-muted text-sm">
          {problems.length} problems on JOINs, aggregation, window functions, CTEs and more.
        </p>
      </header>

      {/* Solved/attempted marks depend on the visitor's cookies, so they stream in afterwards.
          Until then (and in the static shell) the same list renders without them. */}
      <Suspense fallback={<ProblemBrowser problems={problems} statuses={null} />}>
        <ProblemBrowserWithProgress problems={problems} />
      </Suspense>
    </section>
  );
}

async function ProblemBrowserWithProgress({ problems }: { problems: ProblemSummary[] }) {
  const statuses = await getMyProblemStatuses();
  return <ProblemBrowser problems={problems} statuses={statuses} />;
}
