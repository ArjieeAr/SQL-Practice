-- Categories with one product, and products that never sold
INSERT INTO products (id, name, category) VALUES
  (1, 'Telescope', 'Optics'),
  (2, 'Puzzle',    'Games'),
  (3, 'Chess Set', 'Games'),
  (4, 'Kite',      'Outdoor');

INSERT INTO sales (id, product_id, quantity, sold_on) VALUES
  (1, 1, 2, '2025-05-01'),
  (2, 2, 7, '2025-05-01');
