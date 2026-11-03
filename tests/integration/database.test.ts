/**
 * Applies the real Supabase migrations to PGlite (with a small Supabase stand-in, see
 * tests/support) and checks the security model: who can read and write what.
 */
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asAdmin, asClient, createMigratedDatabase } from "../support/database";

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";
const EVE = "00000000-0000-4000-8000-00000000000e";
const PROPOSAL = "20000000-0000-4000-8000-000000000001";
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

  it("start as regular users, whatever the sign-up metadata claims", async () => {
    await asAdmin(db, async () => {
      await db.query(
        `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'eve@example.com', $2)`,
        [EVE, JSON.stringify({ role: "admin" })],
      );
      const { rows } = await db.query("SELECT role FROM profiles WHERE id = $1", [EVE]);
      expect(rows).toEqual([{ role: "user" }]);
    });
  });

  it("users can read their own role", async () => {
    const { rows } = await asClient(db, "authenticated", BOB, () =>
      db.query("SELECT role FROM profiles WHERE id = $1", [BOB]),
    );
    expect(rows).toEqual([{ role: "user" }]);
  });

  it("users cannot make themselves admin", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query("UPDATE profiles SET role = 'admin' WHERE id = $1", [BOB]),
      ),
    );
  });
});

describe("problem_proposals", () => {
  const INSERT_PROPOSAL = `INSERT INTO problem_proposals (id, user_id, title, difficulty, description_md)
    VALUES ($1, $2, 'An idea', 'easy', 'Details') `;

  /** Run as the database owner with one proposal from Alice. Rolled back afterwards. */
  const withProposal = (fn: () => Promise<void>) =>
    asAdmin(db, async () => {
      await db.query(INSERT_PROPOSAL, [PROPOSAL, ALICE]);
      await fn();
    });

  /** Become a client inside the current transaction. */
  const becomeClient = async (user: string) => {
    await db.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: user }),
    ]);
    await db.exec("SET LOCAL ROLE authenticated");
  };

  it("users only see their own", async () => {
    await withProposal(async () => {
      await becomeClient(BOB);
      expect((await db.query("SELECT id FROM problem_proposals")).rows).toEqual([]);
      await db.exec("RESET ROLE");

      await becomeClient(ALICE);
      expect((await db.query("SELECT id FROM problem_proposals")).rows).toEqual([{ id: PROPOSAL }]);
    });
  });

  it("signed-out visitors cannot read them", async () => {
    await expectDenied(
      asClient(db, "anon", null, () => db.query("SELECT * FROM problem_proposals")),
    );
  });

  it("clients cannot create them directly, skipping validation and the rate limit", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () => db.query(INSERT_PROPOSAL, [PROPOSAL, BOB])),
    );
  });

  it("clients cannot approve their own", async () => {
    await expectDenied(
      asClient(db, "authenticated", BOB, () =>
        db.query("UPDATE problem_proposals SET status = 'approved' WHERE user_id = $1", [BOB]),
      ),
    );
  });

  it("reject titles and SQL over the size limits", async () => {
    await expect(
      asAdmin(db, () =>
        db.query(
          `INSERT INTO problem_proposals (user_id, title, difficulty, description_md)
           VALUES ($1, repeat('x', 121), 'easy', 'd')`,
          [ALICE],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("save_problem()", () => {
  const payload = (overrides: Record<string, unknown> = {}) => ({
    slug: "new-problem",
    title: "New Problem",
    difficulty: "medium",
    tags: ["joins", "dates"],
    description_md: "Do the thing.",
    schema_sql: "CREATE TABLE t (x int);",
    sample_data_sql: "INSERT INTO t VALUES (1);",
    order_matters: true,
    is_published: true,
    sample_expected: { columns: [], rows: [], truncated: false },
    sample_tables: [],
    reference_sql: "SELECT x FROM t ORDER BY x",
    pitfalls: [{ name: "wrong", sql: "SELECT 1" }],
    cases: [
      { name: "first", sql: "INSERT INTO t VALUES (1);" },
      { name: "second", sql: "" },
    ],
    ...overrides,
  });
  const save = async (input: Record<string, unknown>) => {
    const { rows } = await db.query<{ saved: { id: string; slug: string; number: number } }>(
      "SELECT save_problem($1) AS saved",
      [JSON.stringify(input)],
    );
    return rows[0].saved;
  };
  const caseNames = async (problemId: string) => {
    const { rows } = await db.query<{ name: string }>(
      "SELECT name FROM test_cases WHERE problem_id = $1 ORDER BY position",
      [problemId],
    );
    return rows.map((row) => row.name);
  };

  for (const [role, user] of [
    ["anon", null],
    ["authenticated", ALICE],
  ] as const) {
    it(`is not callable by ${role} clients`, async () => {
      await expectDenied(
        asClient(db, role, user, () =>
          db.query("SELECT save_problem($1)", [JSON.stringify(payload())]),
        ),
      );
    });
  }

  it("is callable by the service role", async () => {
    await asAdmin(db, async () => {
      await db.exec("SET LOCAL ROLE service_role");
      await expect(save(payload())).resolves.toMatchObject({ slug: "new-problem" });
    });
  });

  it("creates a problem with its hidden parts, using the next free number", async () => {
    await asAdmin(db, async () => {
      const saved = await save(payload());
      expect(saved).toMatchObject({ slug: "new-problem", number: 4 });

      const { rows } = await db.query(
        "SELECT title, tags, order_matters, is_published FROM problems WHERE id = $1",
        [saved.id],
      );
      expect(rows).toEqual([
        {
          title: "New Problem",
          tags: ["joins", "dates"],
          order_matters: true,
          is_published: true,
        },
      ]);
      const solution = await db.query(
        "SELECT reference_sql, pitfalls FROM problem_solutions WHERE problem_id = $1",
        [saved.id],
      );
      expect(solution.rows).toEqual([
        {
          reference_sql: "SELECT x FROM t ORDER BY x",
          pitfalls: [{ name: "wrong", sql: "SELECT 1" }],
        },
      ]);
      expect(await caseNames(saved.id)).toEqual(["first", "second"]);

      expect((await save(payload({ slug: "another" }))).number).toBe(5);
    });
  });

  it("uses the requested number when given one", async () => {
    await asAdmin(db, async () => {
      expect((await save(payload({ number: 40 }))).number).toBe(40);
    });
  });

  it("edits replace the test cases, but never the slug or number", async () => {
    await asAdmin(db, async () => {
      const created = await save(payload());
      const edited = await save(
        payload({
          id: created.id,
          slug: "renamed",
          number: 99,
          title: "Edited",
          cases: [{ name: "only", sql: "" }],
        }),
      );
      expect(edited).toEqual(created);
      expect(await caseNames(created.id)).toEqual(["only"]);
      const { rows } = await db.query("SELECT title FROM problems WHERE id = $1", [created.id]);
      expect(rows).toEqual([{ title: "Edited" }]);
    });
  });

  it("rolls back completely when any part fails", async () => {
    // A case without a name violates test_cases.name NOT NULL, after the other writes succeeded.
    await asAdmin(db, async () => {
      const created = await save(payload());
      await db.exec("SAVEPOINT before_edit");
      await expect(
        save(payload({ id: created.id, title: "Half done", cases: [{ sql: "" }] })),
      ).rejects.toThrow(/null value/);
      await db.exec("ROLLBACK TO SAVEPOINT before_edit");

      const { rows } = await db.query("SELECT title FROM problems WHERE id = $1", [created.id]);
      expect(rows).toEqual([{ title: "New Problem" }]);
      expect(await caseNames(created.id)).toEqual(["first", "second"]);
    });
  });

  it("refuses to edit a problem that doesn't exist, or reuse a slug", async () => {
    await expect(asAdmin(db, () => save(payload({ id: PROPOSAL })))).rejects.toThrow(
      /does not exist/,
    );
    await expect(asAdmin(db, () => save(payload({ slug: "top-earners" })))).rejects.toThrow(
      /unique/,
    );
  });

  describe("with a proposal", () => {
    const proposal = async (status = "pending") => {
      await db.query(
        `INSERT INTO problem_proposals (id, user_id, title, difficulty, description_md, status)
         VALUES ($1, $2, 'An idea', 'easy', 'Details', $3)`,
        [PROPOSAL, ALICE, status],
      );
    };
    const readProposal = async () => {
      const { rows } = await db.query<{
        status: string;
        problem_id: string | null;
        reviewed_by: string | null;
        reviewed: boolean;
      }>(
        `SELECT status, problem_id, reviewed_by, reviewed_at IS NOT NULL AS reviewed
         FROM problem_proposals WHERE id = $1`,
        [PROPOSAL],
      );
      return rows[0];
    };

    it("a draft links the proposal but leaves it pending", async () => {
      await asAdmin(db, async () => {
        await proposal();
        const saved = await save(payload({ proposal_id: PROPOSAL, is_published: false }));
        expect(await readProposal()).toEqual({
          status: "pending",
          problem_id: saved.id,
          reviewed_by: null,
          reviewed: false,
        });
      });
    });

    it("publishing approves it, even when it was linked by an earlier draft", async () => {
      await asAdmin(db, async () => {
        await proposal();
        const draft = await save(payload({ proposal_id: PROPOSAL, is_published: false }));
        await save(payload({ id: draft.id, reviewer_id: BOB }));
        expect(await readProposal()).toEqual({
          status: "approved",
          problem_id: draft.id,
          reviewed_by: BOB,
          reviewed: true,
        });
      });
    });

    it("refuses a proposal that was already rejected, saving nothing", async () => {
      await asAdmin(db, async () => {
        await proposal("rejected");
        await db.exec("SAVEPOINT before_save");
        await expect(save(payload({ proposal_id: PROPOSAL }))).rejects.toThrow(/no longer open/);
        await db.exec("ROLLBACK TO SAVEPOINT before_save");
        const { rows } = await db.query("SELECT 1 FROM problems WHERE slug = 'new-problem'");
        expect(rows).toEqual([]);
      });
    });

    it("refuses a proposal already linked to a different problem", async () => {
      await asAdmin(db, async () => {
        await proposal();
        await save(payload({ proposal_id: PROPOSAL, is_published: false }));
        await expect(
          save(payload({ slug: "another", proposal_id: PROPOSAL, is_published: false })),
        ).rejects.toThrow(/no longer open/);
      });
    });
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
