-- Every sale is in one category
INSERT INTO products (id, name, category) VALUES
  (1, 'Espresso Beans', 'Coffee'),
  (2, 'Filter Papers',  'Coffee');

INSERT INTO order_items (id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 2, 1899),
  (2, 2, 5,  299);
