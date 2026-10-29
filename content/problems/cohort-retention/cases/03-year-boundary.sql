-- December sign-ups retained in January, plus a 30-day trap
INSERT INTO users (id, signed_up_on) VALUES
  (1, '2024-12-01'),
  (2, '2024-12-31'),
  (3, '2024-12-15'),
  (4, '2025-01-31');

INSERT INTO activity (user_id, active_on) VALUES
  (1, '2025-01-31'),
  (2, '2025-01-01'),
  (3, '2025-02-01'),
  (4, '2025-03-01');
