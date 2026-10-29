-- Starting from products with a LEFT JOIN lists categories that never sold
WITH by_category AS (
  SELECT p.category, SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
  FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
  GROUP BY p.category
)
SELECT category, revenue_cents,
       ROUND(100.0 * revenue_cents / SUM(revenue_cents) OVER (), 1) AS pct_of_total
FROM by_category;
