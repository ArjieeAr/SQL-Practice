-- The reference solution's output on the public sample data, as a RawResult
-- ({ columns, rows, truncated }). The problem page shows it as "Expected output" next to the
-- user's Run result. Safe to expose: it's derived only from the public sample rows, not from the
-- hidden test cases, and doesn't reveal the reference query itself. Written by the seed script.
alter table public.problems add column sample_expected jsonb;
