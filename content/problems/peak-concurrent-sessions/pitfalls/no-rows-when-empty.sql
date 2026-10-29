-- Grouping drops the required row when there are no sessions
WITH changes AS (
  SELECT started_at AS at, 1 AS delta FROM sessions
  UNION ALL
  SELECT ended_at, -1 FROM sessions
), live AS (
  SELECT at, SUM(delta) OVER (ORDER BY at, delta ROWS UNBOUNDED PRECEDING) AS live_sessions
  FROM changes
)
SELECT live_sessions AS peak_sessions, MIN(at) AS peak_at
FROM live
GROUP BY live_sessions
ORDER BY live_sessions DESC
LIMIT 1;
