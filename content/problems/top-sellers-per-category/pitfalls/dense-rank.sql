-- DENSE_RANK doesn't skip after a tie, so a tie for first lets the third-best product in
WITH totals AS (
  SELECT p.id, p.category, p.name, SUM(s.quantity) AS units_sold
  FROM sales s JOIN products p ON p.id = s.product_id
  GROUP BY p.id, p.category, p.name
), ranked AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY category ORDER BY units_sold DESC) AS rnk
  FROM totals
)
SELECT category, name AS product, units_sold FROM ranked WHERE rnk <= 2;
