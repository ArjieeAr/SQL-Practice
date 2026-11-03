-- Account roles, user-submitted problem proposals, and transactional problem saves.
--
-- Problems are now managed in the database by admins. Admin checks and sandbox verification live
-- in the app, so every write here still goes through the service role: clients get no new write
-- access, and can't skip those checks by calling Supabase directly.

-- Account tiers. Add later tiers with `alter type ... add value`.
-- Users can't promote themselves: the column grant on profiles only covers display_name and
-- avatar_url. They can read their own role through the existing select policy.
create type public.account_role as enum ('user', 'admin');

alter table public.profiles
  add column role public.account_role not null default 'user';

-- Known-wrong queries, re-checked whenever a problem is edited: [{ "name": ..., "sql": ... }].
-- problem_solutions is already hidden from clients.
alter table public.problem_solutions
  add column pitfalls jsonb not null default '[]' check (jsonb_typeof(pitfalls) = 'array');

create type public.proposal_status as enum ('pending', 'approved', 'rejected');

-- A problem suggested by a user. Only the title, difficulty and description are required; an admin
-- completes the rest in the editor. SQL in here is untrusted and only ever runs in the sandbox.
create table public.problem_proposals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  difficulty      public.difficulty not null,
  tags            text[] not null default '{}',
  description_md  text not null check (char_length(description_md) between 1 and 20000),
  schema_sql      text check (char_length(schema_sql) <= 20000),
  sample_data_sql text check (char_length(sample_data_sql) <= 20000),
  solution_sql    text check (char_length(solution_sql) <= 5000),
  -- Suggested test data: [{ "name": ..., "sql": ... }].
  cases           jsonb not null default '[]' check (jsonb_typeof(cases) = 'array'),
  status          public.proposal_status not null default 'pending',
  -- Shown to the proposer.
  review_note     text check (char_length(review_note) <= 2000),
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  -- The problem an admin started from this proposal. Stays a draft until published.
  problem_id      uuid references public.problems (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Serves "my proposals" (and the rate limit), and the admin queue.
create index problem_proposals_user_recent_idx
  on public.problem_proposals (user_id, created_at desc);
create index problem_proposals_pending_idx
  on public.problem_proposals (created_at)
  where status = 'pending';

-- Same model as submissions: users read their own, and only the server writes, after validating
-- the input and applying the rate limit.
alter table public.problem_proposals enable row level security;

revoke all on public.problem_proposals from anon;
revoke insert, update, delete, truncate on public.problem_proposals from authenticated;

create policy "Users can read their own proposals"
  on public.problem_proposals for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Create or update a problem with its hidden parts in one transaction, so a failed edit can't
-- leave a published problem without test cases. Without an `id` it creates a problem, using
-- `number` if given and otherwise the next free one; a problem's slug and number never change.
--
-- `proposal_id` links a proposal to the problem. Publishing approves every pending proposal
-- linked to it, including one linked by an earlier draft save.
--
-- SECURITY INVOKER: only the service role can run it (see the grants below).
create function public.save_problem(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id           uuid := (payload ->> 'id')::uuid;
  v_number       int := (payload ->> 'number')::int;
  v_proposal_id  uuid := (payload ->> 'proposal_id')::uuid;
  v_reviewer_id  uuid := (payload ->> 'reviewer_id')::uuid;
  v_is_published boolean := (payload ->> 'is_published')::boolean;
  v_tags         text[] := array(select jsonb_array_elements_text(payload -> 'tags'));
  v_slug         text;
begin
  if v_id is null then
    -- Serializes creates, so two admins can't be given the same number.
    perform pg_advisory_xact_lock(hashtext('public.problems.number'));
    if v_number is null then
      select coalesce(max(number), 0) + 1 into v_number from public.problems;
    end if;

    insert into public.problems (
      number, slug, title, difficulty, tags, description_md, schema_sql, sample_data_sql,
      order_matters, is_published, sample_expected, sample_tables
    )
    values (
      v_number,
      payload ->> 'slug',
      payload ->> 'title',
      (payload ->> 'difficulty')::public.difficulty,
      v_tags,
      payload ->> 'description_md',
      payload ->> 'schema_sql',
      payload ->> 'sample_data_sql',
      (payload ->> 'order_matters')::boolean,
      v_is_published,
      payload -> 'sample_expected',
      payload -> 'sample_tables'
    )
    returning id, slug, number into v_id, v_slug, v_number;
  else
    update public.problems set
      title           = payload ->> 'title',
      difficulty      = (payload ->> 'difficulty')::public.difficulty,
      tags            = v_tags,
      description_md  = payload ->> 'description_md',
      schema_sql      = payload ->> 'schema_sql',
      sample_data_sql = payload ->> 'sample_data_sql',
      order_matters   = (payload ->> 'order_matters')::boolean,
      is_published    = v_is_published,
      sample_expected = payload -> 'sample_expected',
      sample_tables   = payload -> 'sample_tables'
    where id = v_id
    returning slug, number into v_slug, v_number;

    if not found then
      raise exception 'Problem % does not exist', v_id;
    end if;
  end if;

  insert into public.problem_solutions (problem_id, reference_sql, pitfalls)
  values (v_id, payload ->> 'reference_sql', coalesce(payload -> 'pitfalls', '[]'))
  on conflict (problem_id) do update set
    reference_sql = excluded.reference_sql,
    pitfalls      = excluded.pitfalls;

  -- Replaced wholesale: simpler than diffing, and cases have no dependents.
  delete from public.test_cases where problem_id = v_id;
  insert into public.test_cases (problem_id, position, name, data_sql)
  select v_id, c.position::int, c.value ->> 'name', c.value ->> 'sql'
  from jsonb_array_elements(coalesce(payload -> 'cases', '[]')) with ordinality as c (value, position);

  if v_proposal_id is not null then
    update public.problem_proposals
    set problem_id = v_id
    where id = v_proposal_id
      and status = 'pending'
      and (problem_id is null or problem_id = v_id);

    if not found then
      raise exception 'Proposal % is no longer open', v_proposal_id;
    end if;
  end if;

  if v_is_published then
    update public.problem_proposals
    set status = 'approved', reviewed_by = v_reviewer_id, reviewed_at = now()
    where problem_id = v_id and status = 'pending';
  end if;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'number', v_number);
end;
$$;

-- Supabase's default privileges grant new functions to clients, so revoke explicitly.
revoke execute on function public.save_problem(jsonb) from public, anon, authenticated;
grant execute on function public.save_problem(jsonb) to service_role;
