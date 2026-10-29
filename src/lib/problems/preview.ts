/**
 * Shapes of the derived JSON stored on each problem (computed by the seed script from the
 * public sample data), with schemas to validate them when read back from the database.
 */
import { z } from "zod";

import type { RawResult, RawValue } from "@/lib/sql/types";

const rawValueSchema: z.ZodType<RawValue> = z.lazy(() =>
  z.union([z.string(), z.null(), z.array(rawValueSchema)]),
);

export const rawResultSchema: z.ZodType<RawResult> = z.object({
  columns: z.array(z.object({ name: z.string(), typeId: z.number() })),
  rows: z.array(z.array(rawValueSchema)),
  truncated: z.boolean(),
});

export const sampleTableSchema = z.object({
  name: z.string(),
  columns: z.array(
    z.object({
      name: z.string(),
      /** Postgres type as written in DDL, e.g. "numeric(10,2)". */
      type: z.string(),
      notNull: z.boolean(),
      primaryKey: z.boolean(),
      /** "table.column" for a single-column foreign key, else null. */
      references: z.string().nullable(),
    }),
  ),
  rows: rawResultSchema,
});

export type SampleTable = z.infer<typeof sampleTableSchema>;
export const sampleTablesSchema = z.array(sampleTableSchema);
