import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

/** Boot PGlite, add the Supabase stand-ins, and apply every migration in order. */
export async function createMigratedDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(await readFile(path.join(ROOT, "tests", "support", "supabase-stub.sql"), "utf8"));

  // Same order the Supabase CLI uses: by filename, which starts with a timestamp.
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(await readFile(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

export type ClientRole = "anon" | "authenticated";

/**
 * Run `fn` the way a Supabase client request would: as the `anon` or `authenticated` role, with
 * the JWT `sub` claim set so auth.uid() returns `userId`. Always rolled back, so tests can't
 * leak state into each other.
 */
export async function asClient<T>(
  db: PGlite,
  role: ClientRole,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.exec("BEGIN");
  try {
    await db.query("SELECT set_config('request.jwt.claims', $1, true)", [
      userId ? JSON.stringify({ sub: userId, role }) : "",
    ]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    return await fn();
  } finally {
    await db.exec("ROLLBACK");
  }
}

/** Run `fn` as the database owner (like the service role: bypasses RLS), then roll back. */
export async function asAdmin<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec("BEGIN");
  try {
    return await fn();
  } finally {
    await db.exec("ROLLBACK");
  }
}
