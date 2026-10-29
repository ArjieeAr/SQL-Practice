-- Guest checkouts (NULL customer_id) mixed in
INSERT INTO customers (id, name, email) VALUES
  (10, 'Hana Mori',    'hana@example.com'),
  (11, 'Ivan Petrov',  'ivan@example.com'),
  (12, 'Jade Lin',     'jade@example.com'),
  (13, 'Kofi Mensah',  'kofi@example.com'),
  (14, 'Lena Fischer', 'lena@example.com'),
  (15, 'Mateo Ruiz',   'mateo@example.com');

INSERT INTO orders (id, customer_id, total, ordered_at) VALUES
  (500, 10,   19.99, '2025-05-01 08:00'),
  (501, NULL, 54.00, '2025-05-01 09:30'),
  (502, 12,    5.25, '2025-05-02 12:00'),
  (503, NULL,  7.10, '2025-05-02 13:45'),
  (504, 13,   88.40, '2025-05-03 17:20'),
  (505, 10,   12.00, '2025-05-04 11:11');
