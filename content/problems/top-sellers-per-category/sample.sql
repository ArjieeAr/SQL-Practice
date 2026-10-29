INSERT INTO products (id, name, category) VALUES
  (1, 'Oat Milk',    'Dairy-Free'),
  (2, 'Almond Milk', 'Dairy-Free'),
  (3, 'Soy Yogurt',  'Dairy-Free'),
  (4, 'Sourdough',   'Bakery'),
  (5, 'Bagels',      'Bakery');

INSERT INTO sales (id, product_id, quantity, sold_on) VALUES
  (1, 1, 30, '2025-02-01'),
  (2, 2, 12, '2025-02-01'),
  (3, 3, 25, '2025-02-02'),
  (4, 4,  8, '2025-02-02'),
  (5, 5, 14, '2025-02-03'),
  (6, 2,  6, '2025-02-04');
