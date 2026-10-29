-- Nothing arrived late
INSERT INTO deliveries (id, order_ref, promised_on, delivered_on) VALUES
  (1, 'ORD-3001', '2025-08-01', '2025-08-01'),
  (2, 'ORD-3002', '2025-08-02', '2025-07-31'),
  (3, 'ORD-3003', '2025-08-03', NULL);
