WITH cohorts AS (
  SELECT id AS user_id,
         date_trunc('month', signed_up_on)::date AS cohort_month
  FROM users
),
retained_users AS (
  SELECT DISTINCT c.user_id
  FROM cohorts c
  JOIN activity a ON a.user_id = c.user_id
  WHERE a.active_on >= c.cohort_month + interval '1 month'
    AND a.active_on <  c.cohort_month + interval '2 months'
)
SELECT c.cohort_month,
       COUNT(*) AS cohort_size,
       COUNT(r.user_id) AS retained,
       ROUND(100.0 * COUNT(r.user_id) / COUNT(*), 1) AS retention_pct
FROM cohorts c
LEFT JOIN retained_users r ON r.user_id = c.user_id
GROUP BY c.cohort_month
ORDER BY c.cohort_month;
