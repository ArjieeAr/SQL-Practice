WITH changes AS (
  SELECT started_at AS at, 1 AS delta FROM sessions
  UNION ALL
  SELECT ended_at, -1 FROM sessions
),
live AS (
  -- At the same instant, process ends (-1) before starts (+1): intervals are half-open.
  SELECT at,
         SUM(delta) OVER (ORDER BY at, delta ROWS UNBOUNDED PRECEDING) AS live_sessions
  FROM changes
)
SELECT COALESCE(MAX(live_sessions), 0) AS peak_sessions,
       MIN(at) FILTER (WHERE live_sessions = (SELECT MAX(live_sessions) FROM live)) AS peak_at
FROM live;
