-- Without de-duplicating days, extra logins on one day break the islands
WITH islands AS (
  SELECT user_id,
         logged_in_at::date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY logged_in_at))::int AS island
  FROM logins
)
SELECT user_id, MAX(streak) AS longest_streak
FROM (SELECT user_id, COUNT(*) AS streak FROM islands GROUP BY user_id, island) s
GROUP BY user_id;
