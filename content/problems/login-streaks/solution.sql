WITH days AS (
  SELECT DISTINCT user_id, logged_in_at::date AS day
  FROM logins
),
islands AS (
  SELECT user_id,
         day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int AS island
  FROM days
),
streaks AS (
  SELECT user_id, COUNT(*) AS streak
  FROM islands
  GROUP BY user_id, island
)
SELECT user_id, MAX(streak) AS longest_streak
FROM streaks
GROUP BY user_id;
