-- Orders at month and year boundaries
INSERT INTO orders (id, ordered_at, status, total) VALUES
  (1, '2024-12-31 23:59:59', 'completed', 500.00),
  (2, '2025-01-01 00:00:00', 'completed',   1.00),
  (3, '2025-05-31 23:59:59', 'completed',   2.00),
  (4, '2025-06-01 00:00:00', 'completed',   4.00),
  (5, '2025-12-31 23:59:59', 'completed',   8.00),
  (6, '2026-01-01 00:00:00', 'completed', 700.00);
