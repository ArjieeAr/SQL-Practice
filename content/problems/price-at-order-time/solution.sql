SELECT o.id AS order_id,
       o.quantity * p.price AS total
FROM orders o
LEFT JOIN LATERAL (
  SELECT pc.price
  FROM price_changes pc
  WHERE pc.product_id = o.product_id
    AND pc.effective_on <= o.ordered_on
  ORDER BY pc.effective_on DESC
  LIMIT 1
) p ON true;
