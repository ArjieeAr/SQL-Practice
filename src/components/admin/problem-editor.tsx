"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DifficultyField,
  NamedSqlList,
  TagsField,
  TextArea,
  TextField,
} from "@/components/authoring/fields";
import { Markdown } from "@/components/problem/markdown";
import { ResultTable } from "@/components/problem/result-table";
import { SampleData } from "@/components/problem/schema-viewer";
import type { EditorIntent, EditorRequest, EditorResponse } from "@/lib/problems/admin-api";
import { AUTHORING_LIMITS as L, slugify, type AuthoredProblem } from "@/lib/problems/authoring";
import type { ProblemVerification } from "@/lib/problems/verify";

interface Feedback {
  error?: string;
  issues?: string[];
  verification?: ProblemVerification;
  /** The description the report describes, as it was when verified. */
  descriptionMd?: string;
  saved?: string;
}

/** Create or edit a problem. Used for new problems, proposals, drafts and published problems. */
export function ProblemEditor({
  initial,
  problemId,
  proposalId,
  isPublished = false,
  publicSlug,
}: {
  initial: AuthoredProblem;
  problemId?: string;
  proposalId?: string;
  isPublished?: boolean;
  /** Shown once a problem exists: its URL no longer changes. */
  publicSlug?: string;
}) {
  const router = useRouter();
  const [problem, setProblem] = useState(initial);
  // A new problem's URL follows its title until the admin edits the URL themselves.
  const [slugEdited, setSlugEdited] = useState(initial.slug !== "");
  const [pending, setPending] = useState<EditorIntent | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({});

  const set = (change: Partial<AuthoredProblem>) => setProblem((p) => ({ ...p, ...change }));

  async function send(intent: EditorIntent) {
    setPending(intent);
    setFeedback({});
    const body: EditorRequest = { intent, problemId, proposalId, problem };
    let result: EditorResponse;
    try {
      const response = await fetch("/api/admin/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      result = (await response.json()) as EditorResponse;
    } catch {
      result = { ok: false, error: "Could not reach the server. Your edits are still here." };
    }
    setPending(null);

    if (!result.ok) {
      setFeedback({
        error: result.error,
        issues: result.issues,
        verification: result.verification,
        descriptionMd: problem.descriptionMd,
      });
    } else if (result.intent === "verify") {
      setFeedback({
        issues: result.issues,
        verification: result.verification,
        descriptionMd: problem.descriptionMd,
      });
    } else if (problemId) {
      setFeedback({ saved: result.intent === "publish" ? "Published." : "Saved as a draft." });
      router.refresh();
    } else {
      // Now that it exists, carry on editing it at its own URL.
      router.replace(`/admin/problems/${result.id}`);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send("verify");
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-4">
        <TextField
          label="Title"
          value={problem.title}
          maxLength={L.title}
          onChange={(title) =>
            set(slugEdited || problemId ? { title } : { title, slug: slugify(title) })
          }
        />
        {publicSlug ? (
          <p className="text-muted text-sm">
            URL: <code className="font-mono">/problems/{publicSlug}</code> (can&apos;t be changed)
          </p>
        ) : (
          <TextField
            label="URL slug"
            hint="The address of the problem: /problems/your-slug. It can't be changed later."
            mono
            value={problem.slug}
            maxLength={L.slug}
            onChange={(slug) => {
              setSlugEdited(true);
              set({ slug });
            }}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <DifficultyField
            value={problem.difficulty}
            onChange={(difficulty) => set({ difficulty })}
          />
          <TagsField value={problem.tags} onChange={(tags) => set({ tags })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={problem.orderMatters}
            onChange={(event) => set({ orderMatters: event.target.checked })}
          />
          Row order matters when grading
        </label>
        <TextArea
          label="Description (Markdown)"
          prose
          rows={10}
          value={problem.descriptionMd}
          maxLength={L.description}
          onChange={(descriptionMd) => set({ descriptionMd })}
        />
      </section>

      <section className="flex flex-col gap-4">
        <TextArea
          label="Schema"
          hint="CREATE TABLE statements. Public: users load this to run queries."
          rows={8}
          value={problem.schemaSql}
          maxLength={L.setupSql}
          onChange={(schemaSql) => set({ schemaSql })}
        />
        <TextArea
          label="Sample data"
          hint="INSERT statements. Public: users can see every row."
          rows={8}
          value={problem.sampleDataSql}
          maxLength={L.setupSql}
          onChange={(sampleDataSql) => set({ sampleDataSql })}
        />
        <TextArea
          label="Reference solution"
          hint="Secret. Defines the correct answer on every dataset."
          rows={8}
          value={problem.solutionSql}
          maxLength={L.query}
          onChange={(solutionSql) => set({ solutionSql })}
        />
      </section>

      <NamedSqlList
        title="Hidden test cases"
        hint={`${L.minCases} to ${L.maxCases} datasets of INSERT statements, loaded after the schema. If this came from a proposal, write your own: the proposer has seen theirs.`}
        itemLabel="Test case"
        nameHint="Users see this name when the case fails, so don't give away the answer."
        items={problem.cases}
        max={L.maxCases}
        onChange={(cases) => set({ cases })}
      />

      <NamedSqlList
        title="Pitfalls (optional)"
        hint="Plausible wrong answers. Publishing is blocked unless a hidden test case rejects every one, which shows the cases cover the edge cases."
        itemLabel="Pitfall"
        items={problem.pitfalls}
        max={L.maxPitfalls}
        onChange={(pitfalls) => set({ pitfalls })}
      />

      <div className="border-border bg-background sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3">
        <button
          type="submit"
          disabled={pending !== null}
          className="border-border bg-surface-raised hover:bg-surface inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending === "verify" && <Loader2 className="size-4 animate-spin" />}
          Verify
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void send("publish")}
          className="bg-accent text-accent-foreground inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending === "publish" && <Loader2 className="size-4 animate-spin" />}
          {isPublished ? "Save and publish" : "Publish"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void send("draft")}
          className="text-muted hover:text-foreground inline-flex h-10 items-center gap-2 px-2 text-sm transition-colors disabled:opacity-60"
        >
          {pending === "draft" && <Loader2 className="size-4 animate-spin" />}
          {isPublished ? "Unpublish and save as draft" : "Save draft"}
        </button>
        {isPublished && publicSlug && (
          <Link
            href={`/problems/${publicSlug}`}
            className="text-accent ml-auto text-sm hover:underline"
          >
            View live problem
          </Link>
        )}
      </div>

      <VerificationReport feedback={feedback} />
    </form>
  );
}

function VerificationReport({ feedback }: { feedback: Feedback }) {
  const { error, issues = [], verification, descriptionMd, saved } = feedback;
  if (saved) {
    return (
      <p role="status" className="text-easy text-sm">
        {saved}
      </p>
    );
  }
  if (!error && !verification) return null;

  const passed = !error && issues.length === 0;

  return (
    <section aria-label="Verification result" className="flex flex-col gap-6">
      <div role={passed ? "status" : "alert"} className="flex flex-col gap-2">
        <p
          className={`flex items-center gap-2 text-sm font-medium ${passed ? "text-easy" : "text-hard"}`}
        >
          {passed ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {passed ? "Ready to publish" : (error ?? "This problem can't be published yet.")}
        </p>
        {issues.length > 0 && (
          <ul className="text-hard list-disc pl-6 text-sm">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>

      {verification && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Description</h2>
            {/* Not published yet and possibly from a proposal, so no remote images. */}
            <Markdown allowImages={false}>{descriptionMd ?? ""}</Markdown>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Expected output on the sample data</h2>
            <ResultTable result={verification.sampleExpected} />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Sample data</h2>
            <SampleData tables={verification.sampleTables} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Expected output on the hidden test cases</h2>
            {verification.cases.map((testCase) => (
              <div key={testCase.name} className="flex flex-col gap-1.5">
                <h3 className="text-muted text-xs">{testCase.name}</h3>
                <ResultTable result={testCase.expected} />
              </div>
            ))}
          </section>
          {verification.pitfalls.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Pitfalls</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {verification.pitfalls.map((pitfall) => (
                  <li key={pitfall.name} className="flex items-center gap-2">
                    {pitfall.caughtBy ? (
                      <CheckCircle2 className="text-easy size-4 shrink-0" aria-hidden />
                    ) : (
                      <XCircle className="text-hard size-4 shrink-0" aria-hidden />
                    )}
                    <span>
                      {pitfall.name}:{" "}
                      {pitfall.caughtBy ? `rejected by "${pitfall.caughtBy}"` : "not rejected"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
