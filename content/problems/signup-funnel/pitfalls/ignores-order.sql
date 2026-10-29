-- Counts users per event type without checking that steps happened in order
SELECT f.step, f.users
FROM (VALUES
  (1, 'visit',    (SELECT COUNT(DISTINCT user_id) FROM events WHERE event = 'visit')),
  (2, 'signup',   (SELECT COUNT(DISTINCT user_id) FROM events WHERE event = 'signup')),
  (3, 'purchase', (SELECT COUNT(DISTINCT user_id) FROM events WHERE event = 'purchase'))
) AS f (position, step, users)
ORDER BY f.position;
