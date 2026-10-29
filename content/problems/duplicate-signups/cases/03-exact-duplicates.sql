-- Exact duplicates alongside a single account
INSERT INTO accounts (id, email, signed_up_at) VALUES
  (1, 'kai@site.org', '2025-07-01 09:00'),
  (2, 'kai@site.org', '2025-07-01 09:01'),
  (3, 'kai@site.org', '2025-07-01 09:02'),
  (4, 'mia@site.org', '2025-07-02 09:00');
