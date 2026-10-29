-- Every customer has ordered
INSERT INTO customers (id, name, email) VALUES
  (7, 'Quentin Blake', 'quentin@example.com'),
  (8, 'Rosa Diaz',     'rosa@example.com');

INSERT INTO orders (id, customer_id, total, ordered_at) VALUES
  (900, 7,    30.00, '2025-07-01 10:00'),
  (901, 8,    15.50, '2025-07-01 10:05'),
  (902, NULL,  9.99, '2025-07-01 10:10');
