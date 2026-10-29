-- Shares that aren't whole numbers
INSERT INTO products (id, name, category) VALUES
  (1, 'Desk Lamp', 'Lighting'),
  (2, 'Notebook',  'Stationery'),
  (3, 'Pen Set',   'Stationery'),
  (4, 'Monitor',   'Electronics');

INSERT INTO order_items (id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 1, 1000),
  (2, 2, 1, 1000),
  (3, 3, 1, 1000),
  (4, 4, 1, 1000),
  (5, 4, 2,  500),
  (6, 2, 1,  333);
