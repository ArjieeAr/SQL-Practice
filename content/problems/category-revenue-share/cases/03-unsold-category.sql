-- A category whose products never sold
INSERT INTO products (id, name, category) VALUES
  (1, 'Yoga Mat',     'Fitness'),
  (2, 'Kettlebell',   'Fitness'),
  (3, 'Bird Feeder',  'Garden'),
  (4, 'Plant Food',   'Garden'),
  (5, 'Snow Globe',   'Seasonal');

INSERT INTO order_items (id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 1, 2500),
  (2, 2, 2, 4000),
  (3, 4, 3,  700);
