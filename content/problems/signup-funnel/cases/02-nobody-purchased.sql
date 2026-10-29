-- Nobody made it to purchase
INSERT INTO events (id, user_id, event, occurred_at) VALUES
  (1, 5, 'visit',  '2025-09-01 10:00'),
  (2, 5, 'visit',  '2025-09-02 10:00'),
  (3, 5, 'signup', '2025-09-02 10:30'),
  (4, 6, 'visit',  '2025-09-03 10:00'),
  (5, 7, 'visit',  '2025-09-03 11:00');
