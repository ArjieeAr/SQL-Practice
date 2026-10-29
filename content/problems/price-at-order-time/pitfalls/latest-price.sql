-- Uses the product's latest price, whenever the order was placed
SELECT o.id AS order_id, o.quantity * (
  SELECT pc.price FROM price_changes pc
  WHERE pc.product_id = o.product_id
  ORDER BY pc.effective_on DESC LIMIT 1
) AS total
FROM orders o;
