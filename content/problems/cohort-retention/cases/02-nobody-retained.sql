-- A cohort where nobody was retained
INSERT INTO users (id, signed_up_on) VALUES
  (1, '2025-06-10'),
  (2, '2025-06-11'),
  (3, '2025-07-01');

INSERT INTO activity (user_id, active_on) VALUES
  (1, '2025-06-12'),
  (2, '2025-08-01'),
  (3, '2025-08-31');
