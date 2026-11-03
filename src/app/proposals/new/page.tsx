import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ProposalForm } from "@/components/proposals/proposal-form";
import { getViewer } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Propose a problem",
};

export default function NewProposalPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Propose a problem</h1>
        <p className="text-muted text-sm">
          Got a good SQL question? Describe it here. A title and a description are enough.
        </p>
      </header>
      <Suspense fallback={<div className="bg-surface h-96 animate-pulse rounded-lg" aria-busy />}>
        <SignedInForm />
      </Suspense>
    </section>
  );
}

async function SignedInForm() {
  if (!(await getViewer())) redirect("/login?next=/proposals/new");
  return <ProposalForm />;
}
