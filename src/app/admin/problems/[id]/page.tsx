import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProblemEditor } from "@/components/admin/problem-editor";
import { requireAdminPage } from "@/lib/auth/roles";
import { getEditableProblem } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Edit problem",
};

export default function EditProblemPage({ params }: PageProps<"/admin/problems/[id]">) {
  return (
    <Suspense fallback={<div className="bg-surface h-96 animate-pulse rounded-lg" aria-busy />}>
      <EditProblem params={params} />
    </Suspense>
  );
}

async function EditProblem({ params }: Pick<PageProps<"/admin/problems/[id]">, "params">) {
  const { id } = await params;
  await requireAdminPage(`/admin/problems/${id}`);

  const problem = await getEditableProblem(id);
  if (!problem) notFound();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {problem.number}. {problem.values.title}
        </h1>
        <p className={`text-sm ${problem.isPublished ? "text-easy" : "text-muted"}`}>
          {problem.isPublished
            ? "Published. Saving changes how new submissions are graded."
            : "Draft. Only admins can see this."}
        </p>
      </header>
      <ProblemEditor
        // Restart from the saved values when navigating between problems.
        key={problem.id}
        initial={problem.values}
        problemId={problem.id}
        isPublished={problem.isPublished}
        publicSlug={problem.values.slug}
      />
    </>
  );
}
