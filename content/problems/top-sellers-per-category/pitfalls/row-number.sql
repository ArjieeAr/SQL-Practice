-- ROW_NUMBER keeps exactly two products per category, dropping tied products
WITH totals AS (
  SELECT p.id, p.category, p.name, SUM(s.quantity) AS units_sold
  FROM sales s JOIN products p ON p.id = s.product_id
  GROUP BY p.id, p.category, p.name
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY units_sold DESC, id) AS rn
  FROM totals
)
SELECT category, name AS product, units_sold FROM ranked WHERE rn <= 2;
