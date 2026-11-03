"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import { createProposal, type ProposalState } from "@/app/proposals/actions";
import {
  DifficultyField,
  NamedSqlList,
  TagsField,
  TextArea,
  TextField,
} from "@/components/authoring/fields";
import { AUTHORING_LIMITS as L, type ProposalInput } from "@/lib/problems/authoring";

const EMPTY: ProposalInput = {
  title: "",
  difficulty: "easy",
  tags: [],
  descriptionMd: "",
  schemaSql: "",
  sampleDataSql: "",
  solutionSql: "",
  cases: [],
};

export function ProposalForm() {
  // Controlled, because a form action resets uncontrolled fields: a rejected proposal must keep
  // what the user typed.
  const [proposal, setProposal] = useState(EMPTY);
  const [state, action, pending] = useActionState<ProposalState, ProposalInput>(createProposal, {});

  const set = (change: Partial<ProposalInput>) => setProposal((p) => ({ ...p, ...change }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => action(proposal));
      }}
      className="flex flex-col gap-6"
    >
      <TextField
        label="Title"
        value={proposal.title}
        maxLength={L.title}
        onChange={(title) => set({ title })}
      />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <DifficultyField
          value={proposal.difficulty}
          onChange={(difficulty) => set({ difficulty })}
        />
        <TagsField value={proposal.tags} onChange={(tags) => set({ tags })} />
      </div>
      <TextArea
        label="What should the query do? (Markdown)"
        hint="Describe the scenario and the result you'd expect."
        prose
        rows={8}
        value={proposal.descriptionMd}
        maxLength={L.description}
        onChange={(descriptionMd) => set({ descriptionMd })}
      />

      <details className="border-border rounded-md border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Add SQL (optional, but it helps)
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <TextArea
            label="Schema"
            hint="CREATE TABLE statements."
            value={proposal.schemaSql}
            maxLength={L.setupSql}
            onChange={(schemaSql) => set({ schemaSql })}
          />
          <TextArea
            label="Sample data"
            hint="INSERT statements."
            value={proposal.sampleDataSql}
            maxLength={L.setupSql}
            onChange={(sampleDataSql) => set({ sampleDataSql })}
          />
          <TextArea
            label="Your solution"
            value={proposal.solutionSql}
            maxLength={L.query}
            onChange={(solutionSql) => set({ solutionSql })}
          />
          <NamedSqlList
            title="Suggested test data"
            hint="Edge cases worth checking: NULLs, ties, empty tables."
            itemLabel="Test case"
            items={proposal.cases}
            max={L.maxCases}
            onChange={(cases) => set({ cases })}
          />
        </div>
      </details>

      <p className="text-muted text-sm">
        An admin reviews every proposal and may rewrite it, including its test data, before it goes
        live. Please only send problems you wrote yourself.
      </p>

      {state.error && (
        <p role="alert" className="text-hard text-sm">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-accent-foreground inline-flex h-10 w-fit items-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Send proposal
      </button>
    </form>
  );
}
