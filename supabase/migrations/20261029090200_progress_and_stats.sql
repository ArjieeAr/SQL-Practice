-- Triggers that keep derived data in sync, plus the profile stats function.

-- Create a profile when someone signs up. GitHub OAuth provides a name and avatar;
-- email sign-ups start without one. SECURITY DEFINER because it runs during sign-up, before the
-- user has any privileges on public.profiles; search_path is pinned so it can't be hijacked.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_name'), 64),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fold each new submission into user_problem_status. Doing this in the database (instead of in
-- the API route) means the two tables can't drift apart, whoever inserts the submission.
create function public.record_submission_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_problem_status (user_id, problem_id, attempts, solved_at, last_submitted_at)
  values (
    new.user_id,
    new.problem_id,
    1,
    case when new.status = 'accepted' then new.created_at end,
    new.created_at
  )
  on conflict (user_id, problem_id) do update set
    attempts          = public.user_problem_status.attempts + 1,
    -- Keep the first time it was solved; later accepted submissions don't move it.
    solved_at         = coalesce(public.user_problem_status.solved_at, excluded.solved_at),
    last_submitted_at = excluded.last_submitted_at;
  return new;
end;
$$;

create trigger on_submission_created
  after insert on public.submissions
  for each row execute function public.record_submission_progress();

-- Profile stats for the signed-in user: solved/total per difficulty and streaks.
--
-- A streak is a run of consecutive UTC days with at least one accepted submission. It's the
-- classic "gaps and islands" problem: subtracting row_number() from each date gives the same
-- value for every day in an unbroken run, so grouping by it yields one row per streak.
-- The current streak is still alive if its last day is today or yesterday.
--
-- SECURITY INVOKER (the default): it reads through the caller's RLS, so it can only ever see
-- the caller's own submissions.
create function public.get_my_stats()
returns table (
  easy_solved    int,
  easy_total     int,
  medium_solved  int,
  medium_total   int,
  hard_solved    int,
  hard_total     int,
  current_streak int,
  longest_streak int
)
language sql
stable
set search_path = ''
as $$
  with solved as (
    select p.difficulty
    from public.user_problem_status s
    join public.problems p on p.id = s.problem_id
    where s.user_id = (select auth.uid()) and s.solved_at is not null and p.is_published
  ),
  totals as (
    select difficulty, count(*)::int as n
    from public.problems
    where is_published
    group by difficulty
  ),
  active_days as (
    select distinct (created_at at time zone 'utc')::date as day
    from public.submissions
    where user_id = (select auth.uid()) and status = 'accepted'
  ),
  islands as (
    select day, day - (row_number() over (order by day))::int as island
    from active_days
  ),
  streaks as (
    select max(day) as last_day, count(*)::int as length
    from islands
    group by island
  ),
  today as (
    select (now() at time zone 'utc')::date as day
  )
  select
    (select count(*)::int from solved where difficulty = 'easy'),
    coalesce((select n from totals where difficulty = 'easy'), 0),
    (select count(*)::int from solved where difficulty = 'medium'),
    coalesce((select n from totals where difficulty = 'medium'), 0),
    (select count(*)::int from solved where difficulty = 'hard'),
    coalesce((select n from totals where difficulty = 'hard'), 0),
    coalesce((
      select s.length from streaks s, today t
      where s.last_day >= t.day - 1
      order by s.last_day desc
      limit 1
    ), 0),
    coalesce((select max(length) from streaks), 0);
$$;

-- Only signed-in users have stats. Trigger functions can't be called directly, but revoke anyway.
revoke execute on function public.get_my_stats() from public, anon;
grant execute on function public.get_my_stats() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.record_submission_progress() from public, anon, authenticated;
