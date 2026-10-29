-- Row Level Security and privileges.
--
-- Supabase grants anon/authenticated broad table privileges by default and relies on RLS to
-- filter rows. We enable RLS everywhere AND revoke the privileges clients should never have,
-- so a mistaken policy later can't silently open up writes or hidden data.
--
-- The grader and seed script use the service role, which bypasses RLS.
-- `(select auth.uid())` instead of `auth.uid()` lets Postgres evaluate it once per query
-- rather than once per row.

alter table public.profiles            enable row level security;
alter table public.problems            enable row level security;
alter table public.problem_solutions   enable row level security;
alter table public.test_cases          enable row level security;
alter table public.submissions         enable row level security;
alter table public.user_problem_status enable row level security;

-- problems: everyone (including signed-out visitors) can read published problems. Read-only.
revoke insert, update, delete, truncate on public.problems from anon, authenticated;

create policy "Published problems are readable by everyone"
  on public.problems for select
  to anon, authenticated
  using (is_published);

-- problem_solutions, test_cases: server only. RLS with no policies already denies every row;
-- revoking privileges makes clients get "permission denied" instead of an empty result.
revoke all on public.problem_solutions from anon, authenticated;
revoke all on public.test_cases        from anon, authenticated;

-- profiles: a user reads and edits only their own, and only the editable columns.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;
grant update (display_name, avatar_url) on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- submissions: users read their own. No client writes at all; only the grader inserts, so a
-- client can't record an "accepted" submission it didn't earn.
revoke all on public.submissions from anon;
revoke insert, update, delete, truncate on public.submissions from authenticated;

create policy "Users can read their own submissions"
  on public.submissions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_problem_status: users read their own; maintained by a trigger.
revoke all on public.user_problem_status from anon;
revoke insert, update, delete, truncate on public.user_problem_status from authenticated;

create policy "Users can read their own progress"
  on public.user_problem_status for select
  to authenticated
  using ((select auth.uid()) = user_id);
