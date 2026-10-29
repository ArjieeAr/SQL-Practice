SELECT m.month::date AS month,
       COUNT(o.id) AS order_count,
       COALESCE(SUM(o.total), 0) AS revenue
FROM generate_series(date '2025-01-01', date '2025-12-01', interval '1 month') AS m (month)
LEFT JOIN orders o
  ON o.status = 'completed'
 AND o.ordered_at >= m.month
 AND o.ordered_at <  m.month + interval '1 month'
GROUP BY m.month
ORDER BY m.month;
