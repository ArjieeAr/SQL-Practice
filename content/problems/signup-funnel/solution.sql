WITH first_visit AS (
  SELECT user_id, MIN(occurred_at) AS at
  FROM events
  WHERE event = 'visit'
  GROUP BY user_id
),
first_signup AS (
  SELECT v.user_id, MIN(e.occurred_at) AS at
  FROM first_visit v
  JOIN events e
    ON e.user_id = v.user_id
   AND e.event = 'signup'
   AND e.occurred_at >= v.at
  GROUP BY v.user_id
),
first_purchase AS (
  SELECT DISTINCT s.user_id
  FROM first_signup s
  JOIN events e
    ON e.user_id = s.user_id
   AND e.event = 'purchase'
   AND e.occurred_at >= s.at
)
SELECT f.step, f.users
FROM (VALUES
  (1, 'visit',    (SELECT COUNT(*) FROM first_visit)),
  (2, 'signup',   (SELECT COUNT(*) FROM first_signup)),
  (3, 'purchase', (SELECT COUNT(*) FROM first_purchase))
) AS f (position, step, users)
ORDER BY f.position;
