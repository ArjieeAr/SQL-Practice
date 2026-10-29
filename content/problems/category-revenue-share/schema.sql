CREATE TABLE products (
  id       int PRIMARY KEY,
  name     text NOT NULL,
  category text NOT NULL
);

CREATE TABLE order_items (
  id               int PRIMARY KEY,
  product_id       int NOT NULL REFERENCES products (id),
  quantity         int NOT NULL CHECK (quantity > 0),
  unit_price_cents int NOT NULL CHECK (unit_price_cents >= 0)
);
