-- Each sample table's columns (type, NOT NULL, primary/foreign key) and rows, as JSON, for the
-- problem page's schema viewer. Derived from the public schema_sql + sample_data_sql by the seed
-- script, so the viewer renders instantly without booting Postgres in the browser first.
alter table public.problems add column sample_tables jsonb;
