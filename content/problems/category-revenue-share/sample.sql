INSERT INTO products (id, name, category) VALUES
  (1, 'Trail Shoes',  'Footwear'),
  (2, 'Wool Socks',   'Footwear'),
  (3, 'Rain Shell',   'Outerwear'),
  (4, 'Headlamp',     'Gear');

INSERT INTO order_items (id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 1, 12000),
  (2, 2, 3,  1500),
  (3, 3, 1, 18000),
  (4, 4, 2,  3500),
  (5, 1, 1, 11000);
