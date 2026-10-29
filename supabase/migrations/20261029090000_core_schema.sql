-- Core tables: profiles, problems (+ their hidden parts), submissions, per-user progress.
-- Security (RLS, grants) lives in the next migration so it can be reviewed on its own.

create type public.difficulty as enum ('easy', 'medium', 'hard');
create type public.submission_status as enum ('accepted', 'wrong_answer', 'error', 'timeout');

-- One row per auth user, created by a trigger on auth.users (see progress migration).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 64),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.problems (
  id              uuid primary key default gen_random_uuid(),
  -- Problem number shown in the list ("12. Second Highest Salary").
  number          int not null unique check (number > 0),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  difficulty      public.difficulty not null,
  tags            text[] not null default '{}',
  description_md  text not null,
  -- Public: the browser loads these into PGlite for "Run" and the schema viewer.
  schema_sql      text not null,
  sample_data_sql text not null,
  starter_sql     text not null default '',
  -- When false, results are compared as a multiset (row order ignored).
  order_matters   boolean not null default false,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index problems_tags_idx on public.problems using gin (tags);

-- Hidden from clients entirely. Kept out of `problems` because RLS filters rows, not columns:
-- a separate table with no client policies is simpler to reason about than column grants.
create table public.problem_solutions (
  problem_id    uuid primary key references public.problems (id) on delete cascade,
  reference_sql text not null
);

-- Hidden test cases. Each case is data only; the schema comes from problems.schema_sql.
create table public.test_cases (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  position   int not null check (position > 0),
  name       text not null,
  data_sql   text not null,
  unique (problem_id, position)
);

-- Written only by the grader (service role), never by clients, so status can't be forged.
create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  problem_id    uuid not null references public.problems (id) on delete cascade,
  query         text not null check (char_length(query) <= 5000),
  status        public.submission_status not null,
  runtime_ms    int check (runtime_ms >= 0),
  passed_cases  int not null check (passed_cases >= 0),
  total_cases   int not null check (total_cases >= passed_cases),
  error_message text,
  created_at    timestamptz not null default now()
);

-- Serves "my submissions for this problem" and "my recent submissions", newest first.
create index submissions_user_problem_idx
  on public.submissions (user_id, problem_id, created_at desc);
create index submissions_user_recent_idx
  on public.submissions (user_id, created_at desc);

-- Denormalized per-user progress, maintained by a trigger on submissions.
-- Lets the problem list show solved/attempted without scanning submission history.
create table public.user_problem_status (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  problem_id        uuid not null references public.problems (id) on delete cascade,
  attempts          int not null default 0,
  -- First accepted submission; null means attempted but not solved.
  solved_at         timestamptz,
  last_submitted_at timestamptz not null,
  primary key (user_id, problem_id)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger problems_set_updated_at
  before update on public.problems
  for each row execute function public.set_updated_at();
