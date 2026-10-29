/**
 * Applies the real Supabase migrations to PGlite (with a small Supabase stand-in, see
 * tests/support) and checks the security model: who can read and write what.
 */
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asAdmin, asClient, createMigratedDatabase } from "../support/database";

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";
const PUBLISHED = "10000000-0000-4000-8000-000000000001";
const DRAFT = "10000000-0000-4000-8000-000000000002";
const HARD = "10000000-0000-4000-8000-000000000003";

let db: PGlite;

/** Expect a query to fail with a Postgres privilege or RLS error. */
async function expectDenied(promise: Promise<unknown>) {
  await expect(promise).rejects.toThrow(/permission denied|row-level security/);
}

beforeAll(async () => {
  db = await createMigratedDatabase();
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${ALICE}', 'alice@example.com', '{"full_name": "Alice", "avatar_url": "https://a.example/a.png"}'),
      ('${BOB}',   'bob@example.com',   '{}');

    INSERT INTO problems (id, number, slug, title, difficulty, description_md, schema_sql, sample_data_sql, is_published) VALUES
      ('${PUBLISHED}', 1, 'top-earners',  'Top Earners',  'easy', 'd', 'CREATE TABLE t (x int);', '', true),
      ('${DRAFT}',     2, 'secret-draft', 'Secret Draft', 'easy', 'd', 'CREATE TABLE t (x int);', '', false),
      ('${HARD}',      3, 'hard-one',     'Hard One',     'hard', 'd', 'CREATE TABLE t (x int);', '', true);

    INSERT INTO problem_solutions (problem_id, reference_sql) VALUES ('${PUBLISHED}', 'SELECT 1');
    INSERT INTO test_cases (problem_id, position, name, data_sql) VALUES ('${PUBLISHED}', 1, 'basic', '');

    INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases) VALUES
      ('${ALICE}', '${PUBLISHED}', 'SELECT 1', 'accepted', 1, 1),
      ('${BOB}',   '${PUBLISHED}', 'SELECT 2', 'wrong_answer', 0, 1);
  `);
});

afterAll(async () => {
  await db?.close();
});

describe("problems", () => {
  it("are readable by signed-out visitors, but only when published", async () => {
    const { rows } = await asClient(db, "anon", null, () =>
      db.query<{ slug: string }>("SELECT slug FROM problems ORDER BY number"),
    );
    expect(rows.map((r) => r.slug)).toEqual(["top-earners", "hard-one"]);
  });

  it("cannot be modified by clients", async () => {
    await expectDenied(
      asClient(db, "authenticated", ALICE, () =>
        db.query("UPDATE problems SET title = 'pwned' WHERE id = $1", [PUBLISHED]),
      ),
    );
  });
});

describe("hidden data: reference solutions and test cases", () => {
  for (const table of ["problem_solutions", "test_cases"]) {
    for (const [role, user] of [
      ["anon", null],
      ["authenticated", ALICE],
    ] as const) {
      it(`${table} is not readable by ${role} clients`, async () => {
        await expectDenied(asClient(db, role, user, () => db.query(`SELECT * FROM ${table}`)));
      });
    }
  }
});

describe("submissions", () => {
  it("users only see their own", async () => {
    const { rows } = await asClient(db, "authenticated", ALICE, () =>
      db.query<{ user_id: string }>("SELECT user_id FROM submissions"),
    );
    expect(rows).toEqual([{ user_id: ALICE }]);
  });

  it("signed-out visitors see none", async () => {
    await expectDenied(asClient(db, "anon", null, () => db.query("SELECT * FROM submissions")));
  });

  it("clients cannot insert, even for themselves (no forged 'accepted')", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query(
          `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases)
           VALUES ($1, $2, 'SELECT 1', 'accepted', 1, 1)`,
          [BOB, PUBLISHED],
        ),
      ),
    );
  });

  it("clients cannot rewrite their history", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query("UPDATE submissions SET status = 'accepted' WHERE user_id = $1", [BOB]),
      ),
    );
  });
});

describe("profiles", () => {
  it("are created on sign-up from OAuth metadata", async () => {
    const { rows } = await db.query(
      "SELECT id, display_name, avatar_url FROM profiles ORDER BY id",
    );
    expect(rows).toEqual([
      { id: ALICE, display_name: "Alice", avatar_url: "https://a.example/a.png" },
      { id: BOB, display_name: null, avatar_url: null },
    ]);
  });

  it("users can update their own display name", async () => {
    const name = await asClient(db, "authenticated", BOB, async () => {
      await db.query("UPDATE profiles SET display_name = 'Bobby' WHERE id = $1", [BOB]);
      const { rows } = await db.query<{ display_name: string }>(
        "SELECT display_name FROM profiles WHERE id = $1",
        [BOB],
      );
      return rows[0]?.display_name;
    });
    expect(name).toBe("Bobby");
  });

  it("users cannot update someone else's profile", async () => {
    const result = await asClient(db, "authenticated", BOB, () =>
      db.query("UPDATE profiles SET display_name = 'hacked' WHERE id = $1", [ALICE]),
    );
    // RLS hides Alice's row from Bob, so the update matches nothing rather than erroring.
    expect(result.affectedRows).toBe(0);
  });

  it("users cannot change columns outside the allowed set", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query("UPDATE profiles SET id = $1 WHERE id = $2", [ALICE, BOB]),
      ),
    );
  });
});

describe("user_problem_status (maintained by trigger)", () => {
  const addSubmission = (user: string, status: string, createdAt = "now()") =>
    db.query(
      `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases, created_at)
       VALUES ($1, $2, 'SELECT 1', $3, 0, 1, ${createdAt})`,
      [user, PUBLISHED, status],
    );
  const progress = (user: string) =>
    db.query<{ attempts: number; solved: boolean; solved_at: Date | null }>(
      `SELECT attempts, solved_at IS NOT NULL AS solved, solved_at
       FROM user_problem_status WHERE user_id = $1 AND problem_id = $2`,
      [user, PUBLISHED],
    );

  it("counts attempts and keeps the first time a problem was solved", async () => {
    await asAdmin(db, async () => {
      const before = (await progress(ALICE)).rows[0];
      expect(before).toMatchObject({ attempts: 1, solved: true });

      await addSubmission(ALICE, "wrong_answer");
      await addSubmission(ALICE, "accepted", "now() + interval '1 day'");
      const after = (await progress(ALICE)).rows[0];
      expect(after.attempts).toBe(3);
      expect(after.solved_at).toEqual(before.solved_at);
    });
  });

  it("marks a problem attempted but unsolved after only failures", async () => {
    const { rows } = await progress(BOB);
    expect(rows[0]).toMatchObject({ attempts: 1, solved: false });
  });

  it("users only see their own progress and cannot edit it", async () => {
    const { rows } = await asClient(db, "authenticated", BOB, () =>
      db.query<{ user_id: string }>("SELECT user_id FROM user_problem_status"),
    );
    expect(rows).toEqual([{ user_id: BOB }]);

    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query("UPDATE user_problem_status SET solved_at = now() WHERE user_id = $1", [BOB]),
      ),
    );
  });
});

describe("get_my_stats()", () => {
  type Stats = Record<string, number>;
  const stats = (user: string) =>
    asClient(db, "authenticated", user, async () => {
      const { rows } = await db.query<Stats>("SELECT * FROM get_my_stats()");
      return rows[0];
    });

  it("counts solved problems per difficulty, ignoring unpublished ones", async () => {
    expect(await stats(ALICE)).toMatchObject({
      easy_solved: 1,
      easy_total: 1, // the draft is not counted
      medium_solved: 0,
      medium_total: 0,
      hard_solved: 0,
      hard_total: 1,
    });
  });

  it("computes current and longest streaks from accepted submissions", async () => {
    const result = await asAdmin(db, async () => {
      // Accepted on days -6, -5, -4, -3 (a 4-day streak), then -1 and today (current: 2).
      // A wrong answer on day -2 does not bridge the gap.
      for (const daysAgo of [6, 5, 4, 3, 1]) {
        await db.query(
          `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases, created_at)
           VALUES ($1, $2, 'SELECT 1', 'accepted', 1, 1, now() - make_interval(days => $3))`,
          [BOB, HARD, daysAgo],
        );
      }
      await db.query(
        `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases, created_at)
         VALUES ($1, $2, 'SELECT 1', 'wrong_answer', 0, 1, now() - interval '2 days')`,
        [BOB, PUBLISHED],
      );
      await db.query(
        `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases)
         VALUES ($1, $2, 'SELECT 1', 'accepted', 1, 1)`,
        [BOB, HARD],
      );
      // Read through the client role inside the same transaction.
      await db.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: BOB }),
      ]);
      await db.exec("SET LOCAL ROLE authenticated");
      const { rows } = await db.query<Stats>("SELECT * FROM get_my_stats()");
      return rows[0];
    });
    expect(result).toMatchObject({ current_streak: 2, longest_streak: 4, hard_solved: 1 });
  });

  it("reports zero streak when the last accepted day was before yesterday", async () => {
    const result = await asAdmin(db, async () => {
      await db.query(
        `INSERT INTO submissions (user_id, problem_id, query, status, passed_cases, total_cases, created_at)
         VALUES ($1, $2, 'SELECT 1', 'accepted', 1, 1, now() - interval '3 days')`,
        [BOB, HARD],
      );
      await db.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: BOB }),
      ]);
      await db.exec("SET LOCAL ROLE authenticated");
      return (await db.query<Stats>("SELECT * FROM get_my_stats()")).rows[0];
    });
    expect(result).toMatchObject({ current_streak: 0, longest_streak: 1 });
  });

  it("is not callable by signed-out visitors", async () => {
    await expectDenied(asClient(db, "anon", null, () => db.query("SELECT * FROM get_my_stats()")));
  });
});
