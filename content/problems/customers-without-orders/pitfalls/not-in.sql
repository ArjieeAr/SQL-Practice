-- NOT IN returns nothing once the subquery contains a NULL
SELECT id AS customer_id, name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
