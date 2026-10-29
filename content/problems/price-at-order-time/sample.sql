INSERT INTO price_changes (product_id, price, effective_on) VALUES
  (1, 10.00, '2025-01-01'),
  (1, 12.50, '2025-03-01'),
  (2,  4.00, '2025-01-15');

INSERT INTO orders (id, product_id, quantity, ordered_on) VALUES
  (1, 1, 2, '2025-02-10'),
  (2, 1, 1, '2025-03-15'),
  (3, 2, 5, '2025-02-01'),
  (4, 2, 3, '2025-01-10');
