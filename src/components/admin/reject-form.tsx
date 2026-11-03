"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { rejectProposal, type RejectState } from "@/app/admin/actions";
import { AUTHORING_LIMITS } from "@/lib/problems/authoring";

/** Reject a proposal with a note that the proposer can read. */
export function RejectForm({ proposalId, title }: { proposalId: string; title: string }) {
  const [state, action, pending] = useActionState<RejectState, FormData>(rejectProposal, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <label className="flex flex-col gap-1.5 text-sm">
        Reason for rejecting (the proposer will see this)
        <textarea
          name="note"
          rows={2}
          required
          maxLength={AUTHORING_LIMITS.reviewNote}
          className="border-border bg-surface focus:border-accent rounded-md border p-2 text-sm outline-none"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-hard text-sm">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-label={`Reject ${title}`}
        className="border-border text-hard hover:bg-surface inline-flex h-9 w-fit items-center gap-1.5 rounded-md border px-3 text-sm transition-colors disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Reject
      </button>
    </form>
  );
}
