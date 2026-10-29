-- Transactions posted at the same moment
INSERT INTO transactions (id, account_id, posted_at, amount) VALUES
  (10, 7, '2025-06-01 09:00:00',  300.00),
  (12, 7, '2025-06-01 12:00:00', -100.00),
  (11, 7, '2025-06-01 12:00:00',  -50.00),
  (13, 7, '2025-06-01 12:00:00',   20.00),
  (14, 7, '2025-06-02 08:00:00',  -70.00);
