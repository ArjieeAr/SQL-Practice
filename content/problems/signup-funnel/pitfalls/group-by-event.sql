-- GROUP BY event only produces steps that occurred, and in no particular order
SELECT event AS step, COUNT(DISTINCT user_id) AS users
FROM events
GROUP BY event
ORDER BY MIN(occurred_at);
