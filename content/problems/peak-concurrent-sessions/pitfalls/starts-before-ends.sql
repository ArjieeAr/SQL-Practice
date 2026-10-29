-- Processing starts before ends at the same instant counts hand-offs as overlaps
WITH changes AS (
  SELECT started_at AS at, 1 AS delta FROM sessions
  UNION ALL
  SELECT ended_at, -1 FROM sessions
), live AS (
  SELECT at, SUM(delta) OVER (ORDER BY at, delta DESC ROWS UNBOUNDED PRECEDING) AS live_sessions
  FROM changes
)
SELECT COALESCE(MAX(live_sessions), 0) AS peak_sessions,
       MIN(at) FILTER (WHERE live_sessions = (SELECT MAX(live_sessions) FROM live)) AS peak_at
FROM live;
