-- Several products tie for second place
INSERT INTO products (id, name, category) VALUES
  (1, 'Tent',        'Camping'),
  (2, 'Sleeping Bag', 'Camping'),
  (3, 'Camp Stove',  'Camping'),
  (4, 'Lantern',     'Camping'),
  (5, 'Compass',     'Camping');

INSERT INTO sales (id, product_id, quantity, sold_on) VALUES
  (1, 1, 10, '2025-04-01'),
  (2, 2,  9, '2025-04-01'),
  (3, 3,  5, '2025-04-02'),
  (4, 3,  4, '2025-04-03'),
  (5, 4,  8, '2025-04-03');
