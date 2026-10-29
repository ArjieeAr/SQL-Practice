-- Duplicates that differ only in capitalization
INSERT INTO accounts (id, email, signed_up_at) VALUES
  (1, 'Rio@Mail.io', '2025-05-01 10:00'),
  (2, 'rio@mail.io', '2025-05-02 10:00'),
  (3, 'ana@mail.io', '2025-05-03 10:00'),
  (4, 'TOM@MAIL.IO', '2025-05-04 10:00'),
  (5, 'tom@mail.io', '2025-05-05 10:00'),
  (6, 'Tom@Mail.io', '2025-05-06 10:00'),
  (7, 'zoe@mail.io', '2025-05-07 10:00');
