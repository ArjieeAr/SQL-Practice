-- Cancelled and refunded orders mixed in
INSERT INTO orders (id, ordered_at, status, total) VALUES
  (1,  '2025-02-14 08:00', 'completed', 300.00),
  (2,  '2025-02-14 09:00', 'cancelled', 999.99),
  (3,  '2025-04-01 12:00', 'refunded',  150.00),
  (4,  '2025-04-03 12:00', 'completed',  10.10),
  (5,  '2025-04-20 12:00', 'completed',  20.20),
  (6,  '2025-09-09 09:09', 'cancelled',  50.00),
  (7,  '2025-11-11 11:11', 'completed',  42.00),
  (8,  '2025-12-24 18:00', 'completed', 250.00);
