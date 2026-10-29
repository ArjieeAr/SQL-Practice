-- A price change on the same day as the order
INSERT INTO price_changes (product_id, price, effective_on) VALUES
  (1, 20.00, '2025-06-01'),
  (1, 25.00, '2025-06-10'),
  (1, 22.00, '2025-06-20');

INSERT INTO orders (id, product_id, quantity, ordered_on) VALUES
  (1, 1, 1, '2025-06-10'),
  (2, 1, 2, '2025-06-09'),
  (3, 1, 3, '2025-06-20'),
  (4, 1, 1, '2025-07-01');
