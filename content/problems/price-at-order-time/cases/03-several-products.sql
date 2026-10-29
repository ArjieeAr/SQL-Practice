-- Several products with different price histories
INSERT INTO price_changes (product_id, price, effective_on) VALUES
  (1, 3.00, '2025-01-01'),
  (1, 2.75, '2025-02-01'),
  (2, 7.50, '2025-01-01'),
  (3, 1.00, '2025-01-01'),
  (3, 1.25, '2025-01-02'),
  (3, 1.50, '2025-01-03');

INSERT INTO orders (id, product_id, quantity, ordered_on) VALUES
  (1, 1, 10, '2025-01-31'),
  (2, 1, 10, '2025-02-01'),
  (3, 2,  2, '2025-12-31'),
  (4, 3,  4, '2025-01-02'),
  (5, 3,  4, '2025-01-05');
