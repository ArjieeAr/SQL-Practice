-- An inner join drops cohorts where nobody was retained
WITH cohorts AS (
  SELECT id AS user_id, date_trunc('month', signed_up_on)::date AS cohort_month FROM users
), sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size FROM cohorts GROUP BY cohort_month
)
SELECT s.cohort_month, s.cohort_size, COUNT(DISTINCT c.user_id) AS retained,
       ROUND(100.0 * COUNT(DISTINCT c.user_id) / s.cohort_size, 1) AS retention_pct
FROM sizes s
JOIN cohorts c ON c.cohort_month = s.cohort_month
JOIN activity a
  ON a.user_id = c.user_id
 AND a.active_on >= c.cohort_month + interval '1 month'
 AND a.active_on <  c.cohort_month + interval '2 months'
GROUP BY s.cohort_month, s.cohort_size
ORDER BY s.cohort_month;
