-- Grouping the orders only produces months that had orders
SELECT date_trunc('month', ordered_at)::date AS month,
       COUNT(*) AS order_count,
       SUM(total) AS revenue
FROM orders
WHERE status = 'completed' AND ordered_at >= '2025-01-01' AND ordered_at < '2026-01-01'
GROUP BY 1
ORDER BY 1;
