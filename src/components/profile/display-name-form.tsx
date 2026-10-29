"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { useActionState, useState } from "react";

import { updateDisplayName, type DisplayNameState } from "@/app/profile/actions";

/** The user's name as a heading, with an inline editor. */
export function DisplayNameForm({ name, fallback }: { name: string | null; fallback: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<DisplayNameState, FormData>(
    async (prev, formData) => {
      const next = await updateDisplayName(prev, formData);
      if (next.saved) setEditing(false);
      return next;
    },
    {},
  );

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{name ?? fallback}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit display name"
          className="text-muted hover:text-foreground rounded p-1 transition-colors"
        >
          <Pencil className="size-4" />
          <span className="sr-only">Edit display name</span>
        </button>
        {state.saved && <Check className="text-easy size-4" aria-label="Saved" />}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor="displayName" className="sr-only">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={name ?? ""}
          maxLength={64}
          autoFocus
          required
          className="border-border bg-surface focus:border-accent h-9 w-64 rounded-md border px-3 text-lg outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-foreground inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-muted hover:text-foreground px-2 text-sm"
        >
          Cancel
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-hard text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
