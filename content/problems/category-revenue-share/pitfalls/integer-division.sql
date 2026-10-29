-- Integer division truncates the percentage before ROUND sees it
WITH by_category AS (
  SELECT p.category, SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
  FROM order_items oi JOIN products p ON p.id = oi.product_id
  GROUP BY p.category
)
SELECT category, revenue_cents,
       ROUND(100 * revenue_cents / (SELECT SUM(quantity * unit_price_cents) FROM order_items), 1) AS pct_of_total
FROM by_category;
