import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { getViewer } from "@/lib/auth/roles";
import { getMyProposals } from "@/lib/data/proposals";
import { timeAgo } from "@/lib/submissions/status";
import type { Enums } from "@/types/database";

export const metadata: Metadata = {
  title: "Your proposals",
};

const STATUS: Record<Enums<"proposal_status">, { label: string; color: string }> = {
  pending: { label: "In review", color: "text-medium" },
  approved: { label: "Published", color: "text-easy" },
  rejected: { label: "Not accepted", color: "text-hard" },
};

export default function ProposalsPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Your proposals</h1>
        <Link
          href="/proposals/new"
          className="bg-accent text-accent-foreground inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Propose a problem
        </Link>
      </header>
      <Suspense fallback={<div className="bg-surface h-40 animate-pulse rounded-lg" aria-busy />}>
        <ProposalList />
      </Suspense>
    </section>
  );
}

async function ProposalList() {
  if (!(await getViewer())) redirect("/login?next=/proposals");
  const proposals = await getMyProposals();

  if (proposals.length === 0) {
    return <p className="text-muted text-sm">You haven&apos;t proposed any problems yet.</p>;
  }

  return (
    <ul className="border-border divide-border divide-y rounded-lg border">
      {proposals.map((proposal) => (
        <li key={proposal.id} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {proposal.status === "approved" && proposal.problem ? (
              <Link
                href={`/problems/${proposal.problem.slug}`}
                className="hover:text-accent font-medium transition-colors"
              >
                {proposal.title}
              </Link>
            ) : (
              <span className="font-medium">{proposal.title}</span>
            )}
            <span className={`text-sm font-medium ${STATUS[proposal.status].color}`}>
              {STATUS[proposal.status].label}
            </span>
          </div>
          <p className="text-muted flex items-center gap-2 text-xs">
            <DifficultyBadge difficulty={proposal.difficulty} />
            Sent {timeAgo(proposal.created_at)}
          </p>
          {proposal.review_note && (
            <p className="text-muted mt-1 text-sm whitespace-pre-wrap">
              Reviewer&apos;s note: {proposal.review_note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
