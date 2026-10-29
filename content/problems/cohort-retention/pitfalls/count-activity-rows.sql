-- Counts activity rows instead of distinct users
WITH cohorts AS (
  SELECT id AS user_id, date_trunc('month', signed_up_on)::date AS cohort_month FROM users
)
SELECT c.cohort_month,
       COUNT(DISTINCT c.user_id) AS cohort_size,
       COUNT(a.user_id) AS retained,
       ROUND(100.0 * COUNT(a.user_id) / COUNT(DISTINCT c.user_id), 1) AS retention_pct
FROM cohorts c
LEFT JOIN activity a
  ON a.user_id = c.user_id
 AND a.active_on >= c.cohort_month + interval '1 month'
 AND a.active_on <  c.cohort_month + interval '2 months'
GROUP BY c.cohort_month
ORDER BY c.cohort_month;
