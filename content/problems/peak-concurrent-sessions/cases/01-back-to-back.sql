-- Sessions that hand off at the same instant
INSERT INTO sessions (id, user_id, started_at, ended_at) VALUES
  (1, 1, '2025-11-01 09:00', '2025-11-01 10:00'),
  (2, 2, '2025-11-01 10:00', '2025-11-01 11:00'),
  (3, 3, '2025-11-01 11:00', '2025-11-01 12:00'),
  (4, 4, '2025-11-01 09:30', '2025-11-01 10:00');
