-- Back-to-back bookings that only touch
INSERT INTO bookings (id, room, starts_at, ends_at) VALUES
  (1, 'Birch', '2025-10-01 08:00', '2025-10-01 09:00'),
  (2, 'Birch', '2025-10-01 09:00', '2025-10-01 10:00'),
  (3, 'Birch', '2025-10-01 10:00', '2025-10-01 11:00'),
  (4, 'Birch', '2025-10-01 10:30', '2025-10-01 10:45'),
  (5, 'Aspen', '2025-10-01 08:00', '2025-10-01 09:00');
