import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProblemEditor } from "@/components/admin/problem-editor";
import { requireAdminPage } from "@/lib/auth/roles";
import { getProposalAsProblem } from "@/lib/data/admin";
import { EMPTY_PROBLEM } from "@/lib/problems/authoring";

export const metadata: Metadata = {
  title: "New problem",
};

export default function NewProblemPage({ searchParams }: PageProps<"/admin/problems/new">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">New problem</h1>
      <Suspense fallback={<div className="bg-surface h-96 animate-pulse rounded-lg" aria-busy />}>
        <NewProblem searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewProblem({
  searchParams,
}: Pick<PageProps<"/admin/problems/new">, "searchParams">) {
  await requireAdminPage("/admin/problems/new");

  const { proposal: proposalId } = await searchParams;
  if (typeof proposalId !== "string") return <ProblemEditor initial={EMPTY_PROBLEM} />;

  const fromProposal = await getProposalAsProblem(proposalId);
  if (!fromProposal) notFound();
  return <ProblemEditor initial={fromProposal} proposalId={proposalId} />;
}
