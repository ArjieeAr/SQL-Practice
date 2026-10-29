INSERT INTO customers (id, name, email) VALUES
  (1, 'Ava Brooks', 'ava@example.com'),
  (2, 'Ben Ortiz',  'ben@example.com'),
  (3, 'Chloe Park', 'chloe@example.com'),
  (4, 'Dev Patel',  'dev@example.com');

INSERT INTO orders (id, customer_id, total, ordered_at) VALUES
  (100, 1,    25.00, '2025-03-01 10:15'),
  (101, 3,    40.50, '2025-03-02 18:40'),
  (102, NULL, 12.00, '2025-03-03 09:05'),
  (103, 1,     8.75, '2025-03-04 14:30');
