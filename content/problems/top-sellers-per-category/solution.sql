WITH totals AS (
  SELECT p.id, p.category, p.name, SUM(s.quantity) AS units_sold
  FROM sales s
  JOIN products p ON p.id = s.product_id
  GROUP BY p.id, p.category, p.name
),
ranked AS (
  SELECT category, name, units_sold,
         RANK() OVER (PARTITION BY category ORDER BY units_sold DESC) AS sales_rank
  FROM totals
)
SELECT category, name AS product, units_sold
FROM ranked
WHERE sales_rank <= 2;
