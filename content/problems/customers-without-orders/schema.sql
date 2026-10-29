CREATE TABLE customers (
  id    int PRIMARY KEY,
  name  text NOT NULL,
  email text NOT NULL
);

CREATE TABLE orders (
  id          int PRIMARY KEY,
  customer_id int REFERENCES customers (id), -- NULL for guest checkouts
  total       numeric(10, 2) NOT NULL,
  ordered_at  timestamp NOT NULL
);
