-- Orders placed before the product had a price
INSERT INTO price_changes (product_id, price, effective_on) VALUES
  (5, 9.99, '2025-08-01');

INSERT INTO orders (id, product_id, quantity, ordered_on) VALUES
  (1, 5, 4, '2025-07-31'),
  (2, 5, 1, '2025-08-01'),
  (3, 6, 2, '2025-08-15');
