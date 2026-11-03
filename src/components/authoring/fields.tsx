"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { DIFFICULTY_LABEL } from "@/components/problems/difficulty-badge";
import { TAG_IDS, TAGS, type Tag } from "@/lib/problems/tags";
import { Constants, type Enums } from "@/types/database";

/** Form fields shared by the proposal form and the admin problem editor. */

const INPUT = "border-border bg-surface focus:border-accent rounded-md border outline-none";

export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-muted text-xs">{children}</span>;
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  maxLength,
  disabled,
  mono,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        disabled={disabled}
        className={`${INPUT} h-10 px-3 disabled:opacity-60 ${mono ? "font-mono text-sm" : ""}`}
      />
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

/** A multi-line field. Monospace by default, because most of these hold SQL. */
export function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 6,
  maxLength,
  prose,
  placeholder,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  prose?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      {hint && <Hint>{hint}</Hint>}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        spellCheck={prose ? undefined : false}
        className={`${INPUT} p-3 leading-relaxed ${prose ? "text-sm" : "font-mono text-xs"}`}
      />
    </label>
  );
}

export function DifficultyField({
  value,
  onChange,
}: {
  value: Enums<"difficulty">;
  onChange: (value: Enums<"difficulty">) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      Difficulty
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Enums<"difficulty">)}
        className={`${INPUT} h-10 px-3`}
      >
        {Constants.public.Enums.difficulty.map((difficulty) => (
          <option key={difficulty} value={difficulty}>
            {DIFFICULTY_LABEL[difficulty]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TagsField({ value, onChange }: { value: Tag[]; onChange: (value: Tag[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5 text-sm">
      <legend className="mb-1.5">Topics</legend>
      <div className="flex flex-wrap gap-2">
        {TAG_IDS.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(selected ? value.filter((other) => other !== tag) : [...value, tag])
              }
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                selected
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {TAGS[tag]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface NamedSql {
  name: string;
  sql: string;
}

/** An editable list of named SQL snippets: hidden test cases, or known-wrong queries. */
export function NamedSqlList({
  title,
  hint,
  itemLabel,
  nameHint,
  sqlPlaceholder,
  items,
  max,
  onChange,
}: {
  title: string;
  hint: ReactNode;
  itemLabel: string;
  nameHint?: string;
  sqlPlaceholder?: string;
  items: NamedSql[];
  max: number;
  onChange: (items: NamedSql[]) => void;
}) {
  const update = (index: number, change: Partial<NamedSql>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...change } : item)));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="flex flex-col gap-1 pb-1">
        <span className="text-sm">{title}</span>
        <Hint>{hint}</Hint>
      </legend>
      {items.map((item, index) => (
        <div
          key={index}
          className="border-border bg-surface/50 flex flex-col gap-3 rounded-md border p-3"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <TextField
                label={`${itemLabel} ${index + 1} name`}
                hint={nameHint}
                value={item.name}
                onChange={(name) => update(index, { name })}
                maxLength={120}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              title={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              className="text-muted hover:text-hard mt-7 rounded p-2 transition-colors"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">{`Remove ${itemLabel.toLowerCase()} ${index + 1}`}</span>
            </button>
          </div>
          <TextArea
            label={`${itemLabel} ${index + 1} SQL`}
            value={item.sql}
            onChange={(sql) => update(index, { sql })}
            placeholder={sqlPlaceholder}
          />
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, { name: "", sql: "" }])}
          className="border-border bg-surface-raised hover:bg-surface inline-flex h-9 w-fit items-center gap-1.5 rounded-md border px-3 text-sm transition-colors"
        >
          <Plus className="size-4" /> Add {itemLabel.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}
