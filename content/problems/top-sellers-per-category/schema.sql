CREATE TABLE products (
  id       int PRIMARY KEY,
  name     text NOT NULL,
  category text NOT NULL
);

CREATE TABLE sales (
  id         int PRIMARY KEY,
  product_id int NOT NULL REFERENCES products (id),
  quantity   int NOT NULL CHECK (quantity > 0),
  sold_on    date NOT NULL
);
