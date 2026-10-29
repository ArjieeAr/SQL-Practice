-- Late across a month and year boundary, with in-transit deliveries
INSERT INTO deliveries (id, order_ref, promised_on, delivered_on) VALUES
  (1, 'ORD-4001', '2024-12-30', '2025-01-02'),
  (2, 'ORD-4002', '2025-02-27', '2025-03-01'),
  (3, 'ORD-4003', '2025-01-15', NULL),
  (4, 'ORD-4004', '2025-01-15', '2025-01-15');
