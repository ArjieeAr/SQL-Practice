import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { RejectForm } from "@/components/admin/reject-form";
import { Markdown } from "@/components/problem/markdown";
import { SqlBlock } from "@/components/problem/schema-viewer";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { requireAdminPage } from "@/lib/auth/roles";
import { getProposalQueue, type QueuedProposal } from "@/lib/data/admin";
import { TAGS, type Tag } from "@/lib/problems/tags";
import { timeAgo } from "@/lib/submissions/status";

export const metadata: Metadata = {
  title: "Proposals",
};

export default function AdminProposalsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
      <Suspense fallback={<div className="bg-surface h-96 animate-pulse rounded-lg" aria-busy />}>
        <ProposalQueue />
      </Suspense>
    </>
  );
}

async function ProposalQueue() {
  await requireAdminPage("/admin/proposals");
  const proposals = await getProposalQueue();

  if (proposals.length === 0) {
    return <p className="text-muted text-sm">Nothing waiting for review.</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </ul>
  );
}

/** Everything here was written by a user: SQL is shown as text and nothing runs until Verify. */
function ProposalCard({ proposal }: { proposal: QueuedProposal }) {
  const sql = [
    ["Schema", proposal.schemaSql],
    ["Sample data", proposal.sampleDataSql],
    ["Solution", proposal.solutionSql],
    ...proposal.cases.map((testCase) => [`Test data: ${testCase.name}`, testCase.sql]),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <li className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold">{proposal.title}</h2>
        <p className="text-muted flex flex-wrap items-center gap-2 text-xs">
          <DifficultyBadge difficulty={proposal.difficulty} />
          {proposal.tags.map((tag) => (
            <span key={tag} className="bg-surface rounded px-1.5 py-0.5">
              {TAGS[tag as Tag] ?? tag}
            </span>
          ))}
          From {proposal.proposer ?? "an unnamed user"}, {timeAgo(proposal.createdAt)}
        </p>
      </header>

      <Markdown allowImages={false}>{proposal.descriptionMd}</Markdown>

      {sql.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-medium">Submitted SQL</summary>
          <div className="mt-3 flex flex-col gap-3">
            {sql.map(([label, text]) => (
              <section key={label} className="flex flex-col gap-1.5">
                <h3 className="text-muted text-xs">{label}</h3>
                <SqlBlock sql={text} />
              </section>
            ))}
          </div>
        </details>
      )}

      <div className="border-border flex flex-col gap-3 border-t pt-4">
        <Link
          href={
            proposal.problemId
              ? `/admin/problems/${proposal.problemId}`
              : `/admin/problems/new?proposal=${proposal.id}`
          }
          aria-label={`${proposal.problemId ? "Continue draft of" : "Start from"} ${proposal.title}`}
          className="bg-accent text-accent-foreground inline-flex h-9 w-fit items-center rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {proposal.problemId ? "Continue draft" : "Start from this"}
        </Link>
        <RejectForm proposalId={proposal.id} title={proposal.title} />
      </div>
    </li>
  );
}
