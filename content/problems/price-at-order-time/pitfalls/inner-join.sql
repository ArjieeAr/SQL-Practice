-- An inner join drops orders that have no applicable price instead of returning NULL
SELECT o.id AS order_id, o.quantity * pc.price AS total
FROM orders o
JOIN price_changes pc
  ON pc.product_id = o.product_id
 AND pc.effective_on = (
   SELECT MAX(effective_on) FROM price_changes
   WHERE product_id = o.product_id AND effective_on <= o.ordered_on
 );
