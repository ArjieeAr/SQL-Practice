CREATE TABLE price_changes (
  product_id   int NOT NULL,
  price        numeric(10, 2) NOT NULL,
  effective_on date NOT NULL,
  PRIMARY KEY (product_id, effective_on)
);

CREATE TABLE orders (
  id         int PRIMARY KEY,
  product_id int NOT NULL,
  quantity   int NOT NULL CHECK (quantity > 0),
  ordered_on date NOT NULL
);
