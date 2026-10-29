-- < misses a price that takes effect on the order date
SELECT o.id AS order_id, o.quantity * (
  SELECT pc.price FROM price_changes pc
  WHERE pc.product_id = o.product_id AND pc.effective_on < o.ordered_on
  ORDER BY pc.effective_on DESC LIMIT 1
) AS total
FROM orders o;
