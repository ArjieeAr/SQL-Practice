-- Several deliveries equally late
INSERT INTO deliveries (id, order_ref, promised_on, delivered_on) VALUES
  (20, 'ORD-2020', '2025-06-10', '2025-06-12'),
  (14, 'ORD-2014', '2025-06-01', '2025-06-03'),
  (17, 'ORD-2017', '2025-06-05', '2025-06-15'),
  (11, 'ORD-2011', '2025-06-01', '2025-06-03'),
  (12, 'ORD-2012', '2025-06-01', '2025-05-30');
